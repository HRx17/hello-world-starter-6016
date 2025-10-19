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

    // Phase 2: Dynamic page limit with smart defaults
    const pageLimit = parseInt(Deno.env.get('CRAWL_PAGE_LIMIT') || '100');

    console.log('Initiating Firecrawl crawl...');
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        limit: pageLimit, // Dynamic limit, default 100 pages
        scrapeOptions: {
          formats: ['html', 'markdown', 'screenshot'],
          onlyMainContent: false,
          includeTags: ['a', 'button', 'input', 'form', 'nav', 'header', 'footer'],
          waitFor: 1500,
        },
        // Exclude common non-content pages and file types
        excludePaths: [
          '*.pdf', '*.zip', '*.doc', '*.docx',
          '*/admin/*', '*/login/*', '*/wp-admin/*',
          '*/404', '*/error'
        ],
        // Only follow valid HTTP/HTTPS links
        allowBackwardLinks: false,
        allowExternalLinks: false,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl crawl error:', errorText);
      
      await supabase
        .from('website_crawls')
        .update({
          status: 'failed',
          error_message: `Firecrawl crawl failed: ${errorText}`,
        })
        .eq('id', crawl.id);
      
      throw new Error(`Firecrawl crawl failed: ${firecrawlResponse.status}`);
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
