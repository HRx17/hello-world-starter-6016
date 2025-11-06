import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
function isPrivateIP(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname) ||
         hostname.match(/^10\./) !== null ||
         hostname.match(/^192\.168\./) !== null ||
         hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) !== null ||
         hostname.match(/^169\.254\./) !== null;
}

function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP(S) URLs are allowed' };
    }
    if (isPrivateIP(parsed.hostname)) {
      return { valid: false, error: 'Private/internal URLs are not allowed' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's JWT token (respects RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const { url, projectId, crawlMode = 'light' } = requestBody;

    // Input validation
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return new Response(JSON.stringify({ error: urlValidation.error }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const validCrawlModes = ['quick', 'light', 'standard', 'comprehensive'];
    if (!validCrawlModes.includes(crawlMode)) {
      return new Response(JSON.stringify({ error: 'Invalid crawl mode' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Starting full website crawl for:', url, 'with mode:', crawlMode, 'User:', user.id);

    // Define crawl modes with precise page limits and smart depth control
    const CRAWL_MODES = {
      quick: { 
        limit: 25, 
        depth: 2, 
        screenshots: false,
        estimatedCredits: '25-35',
        description: 'Homepage + key pages only'
      },
      light: { 
        limit: 50, 
        depth: 2, 
        screenshots: true,
        estimatedCredits: '50-60',
        description: 'Main sections and important pages'
      },
      standard: { 
        limit: 150, 
        depth: 3, 
        screenshots: true,
        estimatedCredits: '150-175',
        description: 'Most pages, excluding deep nested content'
      },
      comprehensive: { 
        limit: 500, 
        depth: 4, 
        screenshots: true,
        estimatedCredits: '500-550',
        description: 'Complete site crawl, all accessible pages'
      }
    };
    
    const config = CRAWL_MODES[crawlMode as keyof typeof CRAWL_MODES];

    // Fallback: Create project if not provided
    let finalProjectId = projectId;
    if (!finalProjectId) {
      console.log('No projectId provided, creating project as fallback');
      try {
        const hostname = new URL(url).hostname;
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: hostname,
            url: url,
          })
          .select()
          .single();
        
        if (projectError) {
          console.error('Failed to create fallback project:', projectError);
        } else {
          finalProjectId = newProject.id;
          console.log('Created fallback project:', finalProjectId);
        }
      } catch (err) {
        console.error('Error creating fallback project:', err);
      }
    }

    // Create crawl job record (RLS will enforce user_id check)
    const { data: crawl, error: crawlError } = await supabase
      .from('website_crawls')
      .insert({
        user_id: user.id,
        project_id: finalProjectId,
        url,
        status: 'queued',
      })
      .select()
      .single();

    if (crawlError) {
      console.error('Error creating crawl job:', crawlError);
      throw crawlError;
    }

    console.log('Crawl job created:', crawl.id);

    // Start Firecrawl crawl (async, non-blocking)
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    console.log(`Initiating Firecrawl crawl with ${crawlMode} mode: ${config.limit} pages max, depth ${config.depth}`);
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        limit: config.limit,
        scrapeOptions: {
          formats: config.screenshots 
            ? ['html', 'markdown', 'screenshot'] 
            : ['html', 'markdown'],
          onlyMainContent: false,
          includeTags: ['a', 'button', 'input', 'form', 'nav', 'header', 'footer', 'main', 'section', 'article'],
          waitFor: 1500,
          removeBase64Images: false,
        },
        allowBackwardLinks: false,
        allowExternalLinks: false,
        maxDepth: config.depth,
        ignoreSitemap: false,
        excludePaths: [
          '.*\\.pdf$', '.*\\.zip$', '.*\\.tar\\.gz$', '.*\\.exe$', '.*\\.dmg$',
          '.*\\.jpg$', '.*\\.jpeg$', '.*\\.png$', '.*\\.gif$', '.*\\.svg$', '.*\\.ico$',
          '.*\\.mp3$', '.*\\.mp4$', '.*\\.avi$', '.*\\.mov$',
          '.*\\.css$', '.*\\.js$', '.*\\.json$', '.*\\.xml$',
          '/tag/', '/tags/', '/category/', '/categories/',
          '/author/', '/authors/', '/archive/', '/archives/',
          '/page/[0-9]+', '/print/', '/feed/', '/rss/',
          '\\?print=', '\\?share=', '\\?replytocom='
        ],
        includePaths: [],
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl API error:', firecrawlResponse.status, errorText);
      
      if (firecrawlResponse.status === 402) {
        const suggestedMode = config.limit > 50 ? 'Try "Light" mode (50 pages) or "Quick" mode (25 pages)' : 'Upgrade your Firecrawl plan';
        
        await supabase
          .from('website_crawls')
          .update({
            status: 'failed',
            error_message: `Insufficient Firecrawl credits. ${suggestedMode}`,
          })
          .eq('id', crawl.id);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Insufficient Firecrawl credits to crawl ${config.limit} pages. ${suggestedMode} or upgrade your Firecrawl plan at https://firecrawl.dev/pricing`,
            errorCode: 'INSUFFICIENT_CREDITS'
          }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (firecrawlResponse.status === 429) {
        await supabase
          .from('website_crawls')
          .update({
            status: 'failed',
            error_message: 'Rate limit exceeded. Please wait a few minutes before trying again.',
          })
          .eq('id', crawl.id);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Firecrawl API rate limit exceeded. Please wait 5-10 minutes and try again.',
            retryAfter: '5 minutes',
            errorCode: 'RATE_LIMIT'
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (firecrawlResponse.status === 403) {
        await supabase
          .from('website_crawls')
          .update({
            status: 'failed',
            error_message: 'This website is not supported by Firecrawl. Some sites require enterprise plans.',
          })
          .eq('id', crawl.id);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This website is blocked by Firecrawl and cannot be crawled. Try a different website or use single-page analysis instead.',
            errorCode: 'WEBSITE_NOT_SUPPORTED'
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      await supabase
        .from('website_crawls')
        .update({
          status: 'failed',
          error_message: `Firecrawl error: ${errorText}`,
        })
        .eq('id', crawl.id);
      
      throw new Error(`Firecrawl API error (${firecrawlResponse.status}): ${errorText}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    const jobId = firecrawlData.id;
    console.log('Firecrawl job started:', jobId);

    await supabase
      .from('website_crawls')
      .update({
        status: 'crawling',
        firecrawl_job_id: jobId,
      })
      .eq('id', crawl.id);

    return new Response(
      JSON.stringify({
        success: true,
        crawlId: crawl.id,
        firecrawlJobId: jobId,
        status: 'crawling',
        message: 'Full website crawl started. Check progress via crawl ID.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in start-website-crawl function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
