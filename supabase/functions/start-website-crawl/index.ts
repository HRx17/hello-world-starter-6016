import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

  try {
    const { url, userId, projectId, crawlMode = 'light' } = await req.json();
    console.log('Starting full website crawl for:', url, 'with mode:', crawlMode, 'User:', userId, 'Project:', projectId);
    
    // Get crawl configuration based on selected mode
    const config = CRAWL_MODES[crawlMode as keyof typeof CRAWL_MODES] || CRAWL_MODES.light;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fallback: Create project if not provided and user is authenticated
    let finalProjectId = projectId;
    if (!finalProjectId && userId) {
      console.log('No projectId provided, creating project as fallback');
      try {
        const hostname = new URL(url).hostname;
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
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

    // Create crawl job record
    const { data: crawl, error: crawlError } = await supabase
      .from('website_crawls')
      .insert({
        user_id: userId,
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
        allowBackwardLinks: false, // CRITICAL: Prevent crawling back to parent pages
        allowExternalLinks: false,
        maxDepth: config.depth,
        ignoreSitemap: false,
        deduplicateSimilarPages: true, // CRITICAL: Skip duplicate/similar pages
        excludePaths: [
          // Files
          '.*\\.pdf$', '.*\\.zip$', '.*\\.tar\\.gz$', '.*\\.exe$', '.*\\.dmg$',
          '.*\\.jpg$', '.*\\.jpeg$', '.*\\.png$', '.*\\.gif$', '.*\\.svg$', '.*\\.ico$',
          '.*\\.mp3$', '.*\\.mp4$', '.*\\.avi$', '.*\\.mov$',
          '.*\\.css$', '.*\\.js$', '.*\\.json$', '.*\\.xml$',
          // Common unnecessary pages
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
      
      // Handle insufficient credits (402)
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
      
      // Handle rate limiting (429)
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
      
      // Handle other errors
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

    // Update crawl with job ID
    await supabase
      .from('website_crawls')
      .update({
        status: 'crawling',
        firecrawl_job_id: jobId,
      })
      .eq('id', crawl.id);

    // Return immediately with crawl ID
    // Analysis will happen in background via polling or webhook
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
