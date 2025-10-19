import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlOptions {
  url: string;
  maxPages: number;
  userId: string;
  projectId?: string;
}

interface CrawledPage {
  url: string;
  html: string;
  title: string;
  links: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxPages = 10, userId, projectId }: CrawlOptions = await req.json();
    
    console.log('Starting basic crawl for:', url, 'max pages:', maxPages);

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL provided');
    }

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
        status: 'crawling',
        total_pages: 0,
        crawled_pages: 0,
      })
      .select()
      .single();

    if (crawlError) {
      console.error('Error creating crawl job:', crawlError);
      throw crawlError;
    }

    console.log('Crawl job created:', crawl.id);

    // Start crawling
    const visited = new Set<string>();
    const queue: Array<{url: string, depth: number}> = [{url, depth: 0}];
    const crawledPages: CrawledPage[] = [];
    const startTime = Date.now();
    const maxDuration = 120000; // 120 seconds max to avoid timeout

    while (queue.length > 0 && crawledPages.length < maxPages) {
      // Check timeout (leave 30s buffer for processing)
      if (Date.now() - startTime > maxDuration) {
        console.log('Timeout approaching, stopping crawl');
        break;
      }

      const current = queue.shift()!;
      
      if (visited.has(current.url) || current.depth > 2) {
        continue;
      }

      try {
        console.log(`Crawling: ${current.url} (depth: ${current.depth}, ${crawledPages.length}/${maxPages})`);
        visited.add(current.url);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s per page

        const response = await fetch(current.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; UXAnalyzer/1.0; +https://uxanalyzer.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.error(`Failed to fetch ${current.url}: ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          console.log(`Skipping non-HTML content: ${current.url}`);
          continue;
        }

        const html = await response.text();
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

        // Extract links
        const linkMatches = html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi);
        const links: string[] = [];
        const baseUrl = new URL(url);
        
        for (const match of linkMatches) {
          try {
            const href = match[1];
            
            // Skip anchors, mailto, tel, javascript
            if (href.startsWith('#') || href.startsWith('mailto:') || 
                href.startsWith('tel:') || href.startsWith('javascript:')) {
              continue;
            }

            const absoluteUrl = new URL(href, current.url).href;
            const linkUrl = new URL(absoluteUrl);
            
            // Only follow same-domain links
            if (linkUrl.hostname === baseUrl.hostname && 
                !visited.has(absoluteUrl) &&
                !absoluteUrl.match(/\.(pdf|jpg|jpeg|png|gif|zip|exe|dmg)$/i)) {
              links.push(absoluteUrl);
              if (current.depth < 2 && crawledPages.length + queue.length < maxPages) {
                queue.push({ url: absoluteUrl, depth: current.depth + 1 });
              }
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }

        crawledPages.push({
          url: current.url,
          html,
          title,
          links,
        });

        // Update progress every 3 pages
        if (crawledPages.length % 3 === 0) {
          await supabase
            .from('website_crawls')
            .update({
              crawled_pages: crawledPages.length,
              total_pages: visited.size,
            })
            .eq('id', crawl.id);
        }

      } catch (error) {
        console.error(`Error crawling ${current.url}:`, error);
        continue;
      }
    }

    console.log(`Crawl complete: ${crawledPages.length} pages crawled out of ${visited.size} visited`);

    // Update crawl status to completed
    await supabase
      .from('website_crawls')
      .update({
        status: 'analyzing',
        total_pages: crawledPages.length,
        crawled_pages: crawledPages.length,
      })
      .eq('id', crawl.id);

    return new Response(
      JSON.stringify({
        success: true,
        crawlId: crawl.id,
        pages: crawledPages,
        totalPages: crawledPages.length,
        message: `Successfully crawled ${crawledPages.length} pages (free basic crawl - no screenshots)`,
        method: 'basic',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in crawl-website-basic function:', error);
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
