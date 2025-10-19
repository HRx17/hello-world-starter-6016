import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UI_PATTERN_DATABASE, detectPattern } from "../analyze-website/ui-pattern-database.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { crawlId } = await req.json();
    console.log('Checking crawl status for:', crawlId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get crawl job
    const { data: crawl, error: crawlError } = await supabase
      .from('website_crawls')
      .select('*')
      .eq('id', crawlId)
      .single();

    if (crawlError) {
      throw crawlError;
    }

    if (!crawl.firecrawl_job_id) {
      return new Response(
        JSON.stringify({ status: crawl.status, progress: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Firecrawl job status
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const statusResponse = await fetch(
      `https://api.firecrawl.dev/v1/crawl/${crawl.firecrawl_job_id}`,
      {
        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` },
      }
    );

    if (!statusResponse.ok) {
      console.error('Firecrawl status check failed');
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to check crawl status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('Firecrawl status:', statusData.status);

    // Update crawl progress
    await supabase
      .from('website_crawls')
      .update({
        total_pages: statusData.total || 0,
        crawled_pages: statusData.completed || 0,
      })
      .eq('id', crawlId);

    // If crawl is complete, start analysis
    if (statusData.status === 'completed' && crawl.status !== 'analyzing' && crawl.status !== 'completed') {
      console.log('Crawl completed, starting analysis...');
      
      await supabase
        .from('website_crawls')
        .update({ status: 'analyzing' })
        .eq('id', crawlId);

      // Trigger analysis in background (non-blocking)
      analyzeAllPages(crawlId, statusData.data, supabase).catch(err => 
        console.error('Background analysis error:', err)
      );
    }

    return new Response(
      JSON.stringify({
        status: crawl.status,
        total_pages: statusData.total || crawl.total_pages,
        crawled_pages: statusData.completed || crawl.crawled_pages,
        analyzed_pages: crawl.analyzed_pages,
        firecrawl_status: statusData.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error checking crawl status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Background task to analyze all crawled pages
async function analyzeAllPages(crawlId: string, pages: any[], supabase: any) {
  console.log(`Analyzing ${pages.length} pages for crawl ${crawlId}`);
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return;
  }

  const allViolations: any[] = [];
  const allStrengths: any[] = [];
  let totalScore = 0;
  let analyzedCount = 0;

  for (const page of pages) {
    try {
      console.log(`Analyzing page: ${page.url}`);
      
      const { html, markdown, screenshot, metadata } = page;
      
      // Classify page type
      const pageType = classifyPageType(page.url, html);
      
      // Analyze page using hybrid system (same as single-page analysis)
      const analysis = await analyzePage(html, markdown, screenshot, LOVABLE_API_KEY);
      
      // Store page analysis
      await supabase.from('page_analyses').insert({
        crawl_id: crawlId,
        page_url: page.url,
        page_title: metadata?.title || 'Untitled',
        page_type: pageType,
        screenshot: screenshot,
        score: analysis.score,
        violations: analysis.violations,
        strengths: analysis.strengths,
        html_snapshot: html.substring(0, 10000), // Store first 10k chars
      });

      // Aggregate results
      allViolations.push(...analysis.violations);
      allStrengths.push(...analysis.strengths);
      totalScore += analysis.score;
      analyzedCount++;

      // Update progress
      await supabase
        .from('website_crawls')
        .update({ analyzed_pages: analyzedCount })
        .eq('id', crawlId);

    } catch (error) {
      console.error(`Error analyzing page ${page.url}:`, error);
    }
  }

  // Calculate overall score and deduplicate violations
  const overallScore = analyzedCount > 0 ? Math.round(totalScore / analyzedCount) : 0;
  const uniqueViolations = deduplicateViolations(allViolations);
  const uniqueStrengths = deduplicateStrengths(allStrengths);

  // Update crawl with final results
  await supabase
    .from('website_crawls')
    .update({
      status: 'completed',
      overall_score: overallScore,
      aggregate_violations: uniqueViolations,
      aggregate_strengths: uniqueStrengths,
      completed_at: new Date().toISOString(),
    })
    .eq('id', crawlId);

  console.log(`Crawl ${crawlId} analysis completed. Score: ${overallScore}`);
}

function classifyPageType(url: string, html: string): string {
  const urlLower = url.toLowerCase();
  const htmlLower = html.toLowerCase();
  
  if (urlLower.includes('/checkout') || urlLower.includes('/cart')) return 'checkout';
  if (urlLower.includes('/product') || htmlLower.includes('add to cart')) return 'product';
  if (urlLower.includes('/category') || urlLower.includes('/collection')) return 'listing';
  if (urlLower.includes('/about')) return 'about';
  if (urlLower.includes('/contact')) return 'contact';
  if (urlLower === new URL(url).origin + '/' || urlLower.endsWith('.com/')) return 'homepage';
  
  return 'other';
}

async function analyzePage(html: string, markdown: string, screenshot: string, apiKey: string) {
  // Simplified version of the hybrid analysis from analyze-website
  // Rule-based pattern detection
  const detectedPatterns: any[] = [];
  for (const uiPattern of UI_PATTERN_DATABASE) {
    for (const badPattern of uiPattern.badPatterns) {
      if (detectPattern(html, badPattern)) {
        detectedPatterns.push({
          heuristic: uiPattern.heuristics[0] || "General UX",
          severity: badPattern.severity,
          title: badPattern.description,
          description: `${uiPattern.component}: ${badPattern.description}`,
          recommendation: badPattern.recommendation,
        });
      }
    }
  }

  // Calculate score
  let score = 100;
  detectedPatterns.forEach(p => {
    if (p.severity === 'high') score -= 10;
    else if (p.severity === 'medium') score -= 5;
    else score -= 2;
  });
  score = Math.max(40, Math.min(100, score));

  return {
    score,
    violations: detectedPatterns,
    strengths: [], // Simplified - can be enhanced
  };
}

function deduplicateViolations(violations: any[]): any[] {
  const seen = new Set();
  return violations.filter(v => {
    const key = `${v.heuristic}-${v.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateStrengths(strengths: any[]): any[] {
  const seen = new Set();
  return strengths.filter(s => {
    const key = `${s.heuristic}-${s.description?.substring(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
