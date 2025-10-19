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

  try {
    const { url, userId, projectId } = await req.json();
    console.log('Starting full website crawl for:', url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create crawl job record
    const { data: crawl, error: crawlError } = await supabase
      .from('website_crawls')
      .insert({
        user_id: userId,
        project_id: projectId,
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

    // Aggressive crawling configuration for maximum page discovery
    const pageLimit = parseInt(Deno.env.get('CRAWL_PAGE_LIMIT') || '500'); // Increased from 100 to 500

    console.log('Initiating comprehensive Firecrawl crawl...');
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        limit: pageLimit, // High limit for comprehensive crawling
        scrapeOptions: {
          formats: ['html', 'markdown', 'screenshot'],
          onlyMainContent: false,
          includeTags: ['a', 'button', 'input', 'form', 'nav', 'header', 'footer', 'main', 'section', 'article'],
          waitFor: 2000, // Increased wait time for dynamic content
          removeBase64Images: false, // Keep all images
        },
        // Aggressive discovery settings
        allowBackwardLinks: true, // Follow all internal links
        allowExternalLinks: false, // Stay on same domain
        maxDepth: 10, // Deep crawling up to 10 levels
        ignoreSitemap: false, // Use sitemap if available
        // Only exclude actual file downloads, not pages
        excludePaths: [
          '*.pdf', '*.zip', '*.tar.gz', '*.exe', '*.dmg',
          '*.jpg', '*.jpeg', '*.png', '*.gif', '*.svg', '*.ico', // Image files
          '*.mp3', '*.mp4', '*.avi', '*.mov', // Media files
          '*.css', '*.js', '*.json', '*.xml' // Asset files
        ],
        includePaths: [], // Include everything not explicitly excluded
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl API error:', firecrawlResponse.status, errorText);
      
      // Handle rate limiting specifically
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
            error: 'Firecrawl API rate limit exceeded. Please wait a few minutes and try again.',
            retryAfter: '5 minutes'
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
