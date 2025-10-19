import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UI Pattern Database - Inline to avoid cross-function imports
interface Pattern {
  description: string;
  indicators: string[];
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  researchBacked: string;
  conversionImpact?: string;
}

interface UIPattern {
  component: string;
  heuristics: string[];
  goodPatterns: Pattern[];
  badPatterns: Pattern[];
}

const NAVIGATION_PATTERNS: UIPattern = {
  component: "Navigation",
  heuristics: ["Recognition Rather than Recall", "Consistency and Standards"],
  goodPatterns: [
    {
      description: "Clear, descriptive navigation labels",
      indicators: ["nav", "menu", "aria-label"],
      severity: "low",
      recommendation: "Maintain clear navigation structure",
      researchBacked: "Baymard: 94% of sites with clear nav labels had higher task completion"
    }
  ],
  badPatterns: [
    {
      description: "Hover-dependent mega menu without click alternative",
      indicators: ["mega-menu", "dropdown", ":hover", "onmouseover"],
      severity: "high",
      recommendation: "Implement click-to-open mega menus with hover as enhancement",
      researchBacked: "Baymard: 72% of users struggled with hover-only menus on desktop",
      conversionImpact: "Can reduce product findability by 35%"
    },
    {
      description: "Hidden or unclear navigation",
      indicators: ["display:none", "visibility:hidden", "hamburger"],
      severity: "medium",
      recommendation: "Make primary navigation visible and accessible",
      researchBacked: "Nielsen Norman Group: Hidden navigation reduces discoverability"
    }
  ]
};

const FORM_PATTERNS: UIPattern = {
  component: "Forms",
  heuristics: ["Error Prevention", "Help and Documentation", "User Control and Freedom"],
  goodPatterns: [
    {
      description: "Inline validation with clear error messages",
      indicators: ["input", "validation", "error-message", "aria-invalid"],
      severity: "low",
      recommendation: "Continue using inline validation",
      researchBacked: "Baymard: Inline validation reduces form abandonment by 22%"
    }
  ],
  badPatterns: [
    {
      description: "Missing or unclear field labels",
      indicators: ["input", "placeholder"],
      severity: "high",
      recommendation: "Always use visible labels above or beside form fields",
      researchBacked: "Baymard: 89% of users struggled with placeholder-only forms",
      conversionImpact: "Increases form abandonment by 47%"
    },
    {
      description: "Required fields not clearly marked",
      indicators: ["required", "input"],
      severity: "medium",
      recommendation: "Mark all required fields with asterisk or 'required' label",
      researchBacked: "WCAG 2.1: Required field indicators improve accessibility"
    }
  ]
};

const BUTTON_PATTERNS: UIPattern = {
  component: "Buttons & CTAs",
  heuristics: ["Visibility of System Status", "Aesthetic and Minimalist Design"],
  goodPatterns: [
    {
      description: "Clear, action-oriented button text",
      indicators: ["button", "btn", "cta"],
      severity: "low",
      recommendation: "Maintain descriptive button labels",
      researchBacked: "Nielsen: Action-oriented CTAs improve conversion"
    }
  ],
  badPatterns: [
    {
      description: "Generic or vague CTA text like 'Click here' or 'Submit'",
      indicators: ["button", "click here", "submit", "learn more"],
      severity: "medium",
      recommendation: "Use specific, action-oriented text that describes the outcome",
      researchBacked: "Baymard: Specific CTAs increase click-through by 28%"
    },
    {
      description: "Low contrast buttons that blend with background",
      indicators: ["button", "color:", "background"],
      severity: "high",
      recommendation: "Ensure 4.5:1 contrast ratio minimum for CTAs",
      researchBacked: "WCAG 2.1 Level AA requirement for accessibility"
    }
  ]
};

const ERROR_PATTERNS: UIPattern = {
  component: "Error Messages",
  heuristics: ["Error Prevention", "Help Users Recognize, Diagnose, and Recover from Errors"],
  goodPatterns: [
    {
      description: "Specific, helpful error messages",
      indicators: ["error", "alert", "validation"],
      severity: "low",
      recommendation: "Continue providing clear error guidance",
      researchBacked: "Nielsen: Specific errors reduce user frustration"
    }
  ],
  badPatterns: [
    {
      description: "Generic error messages without guidance",
      indicators: ["error occurred", "invalid input", "try again"],
      severity: "high",
      recommendation: "Provide specific error details and clear recovery steps",
      researchBacked: "Baymard: Generic errors increase form abandonment by 67%",
      conversionImpact: "Can reduce checkout completion by 25%"
    }
  ]
};

const LOADING_PATTERNS: UIPattern = {
  component: "Loading States",
  heuristics: ["Visibility of System Status"],
  goodPatterns: [
    {
      description: "Clear loading indicators with progress feedback",
      indicators: ["loading", "spinner", "progress", "skeleton"],
      severity: "low",
      recommendation: "Maintain loading state visibility",
      researchBacked: "Nielsen: Progress indicators reduce perceived wait time"
    }
  ],
  badPatterns: [
    {
      description: "No loading indicator for async operations",
      indicators: ["fetch", "async", "await"],
      severity: "medium",
      recommendation: "Always show loading state for operations > 1 second",
      researchBacked: "Nielsen: Users expect feedback within 1 second"
    }
  ]
};

const MODAL_PATTERNS: UIPattern = {
  component: "Modals & Dialogs",
  heuristics: ["User Control and Freedom", "Recognition Rather than Recall"],
  goodPatterns: [
    {
      description: "Modal with clear close button and ESC key support",
      indicators: ["modal", "dialog", "close", "aria-modal"],
      severity: "low",
      recommendation: "Maintain clear exit options",
      researchBacked: "WCAG: Multiple exit methods improve accessibility"
    }
  ],
  badPatterns: [
    {
      description: "Modal without obvious close mechanism",
      indicators: ["modal", "dialog", "overlay"],
      severity: "high",
      recommendation: "Always provide visible close button and ESC key support",
      researchBacked: "Baymard: 68% of users struggle with uncloseable modals"
    },
    {
      description: "Auto-playing videos or animations in modals",
      indicators: ["modal", "video", "autoplay", "animation"],
      severity: "medium",
      recommendation: "Never auto-play media without user consent",
      researchBacked: "WCAG 2.1: Auto-play violates accessibility guidelines"
    }
  ]
};

const UI_PATTERN_DATABASE: UIPattern[] = [
  NAVIGATION_PATTERNS,
  FORM_PATTERNS,
  BUTTON_PATTERNS,
  ERROR_PATTERNS,
  LOADING_PATTERNS,
  MODAL_PATTERNS
];

function detectPattern(html: string, pattern: Pattern): boolean {
  const htmlLower = html.toLowerCase();
  return pattern.indicators.some(indicator => htmlLower.includes(indicator.toLowerCase()));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let crawlId: string | undefined;
  
  try {
    const body = await req.json();
    crawlId = body.crawlId;
    
    if (!crawlId) {
      return new Response(
        JSON.stringify({ error: 'crawlId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
      const statusCode = statusResponse.status;
      console.error(`Firecrawl status check failed with status ${statusCode}`);
      
      // Handle specific error cases
      if (statusCode === 404) {
        // Crawl job not found or expired
        await supabase
          .from('website_crawls')
          .update({ 
            status: 'error',
            metadata: { error: 'Crawl job expired or not found' }
          })
          .eq('id', crawlId);
        
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            error_message: 'Crawl job expired. Please start a new crawl.',
            should_restart: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (statusCode === 429) {
        // Rate limited - wait and retry
        console.log('Rate limited, continuing to poll...');
        return new Response(
          JSON.stringify({ 
            status: crawl.status,
            message: 'Rate limited, retrying...',
            crawled_pages: crawl.crawled_pages,
            analyzed_pages: crawl.analyzed_pages
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Other errors - return current state
      return new Response(
        JSON.stringify({ 
          status: crawl.status,
          crawled_pages: crawl.crawled_pages,
          analyzed_pages: crawl.analyzed_pages,
          message: 'Temporary error checking status'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('Firecrawl status:', statusData.status);
    console.log('Firecrawl data:', JSON.stringify(statusData).substring(0, 500));
    
    // Check for Firecrawl errors
    if (!statusData.success && statusData.error) {
      console.error('Firecrawl returned error:', statusData.error);
      
      // Update crawl with error
      await supabase
        .from('website_crawls')
        .update({ 
          status: 'error',
          metadata: { error: statusData.error }
        })
        .eq('id', crawlId);
      
      return new Response(
        JSON.stringify({ 
          status: 'error',
          error_message: statusData.error,
          should_restart: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update crawl progress
    await supabase
      .from('website_crawls')
      .update({
        total_pages: statusData.total || 0,
        crawled_pages: statusData.completed || 0,
      })
      .eq('id', crawlId);

    // Check if crawl has data ready (handles both "completed" and "scraping" with full data)
    const hasCompleteData = statusData.data && Array.isArray(statusData.data) && statusData.data.length > 0;
    const isReadyForAnalysis = (
      (statusData.status === 'completed' || 
       (statusData.status === 'scraping' && statusData.completed === statusData.total && hasCompleteData)) &&
      crawl.status !== 'analyzing' && 
      crawl.status !== 'completed'
    );
    
    if (isReadyForAnalysis) {
      console.log(`Crawl ready! Status: ${statusData.status}, Pages: ${statusData.data?.length || 0}`);
      
      // Validate we have data
      if (!hasCompleteData) {
        console.error('No pages data available from Firecrawl');
        await supabase
          .from('website_crawls')
          .update({ 
            status: 'error',
            metadata: { error: 'No pages data received from crawl' }
          })
          .eq('id', crawlId);
        
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'No pages data received from crawl' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      await supabase
        .from('website_crawls')
        .update({ 
          status: 'analyzing',
          analyzed_pages: 0
        })
        .eq('id', crawlId);

      // Trigger analysis in background with automatic retry on failure
      analyzeAllPages(crawlId, statusData.data, supabase).catch(async (err) => {
        console.error('Background analysis error:', err);
        
        // Mark as error initially
        await supabase
          .from('website_crawls')
          .update({ 
            status: 'error',
            metadata: { 
              error: err.message,
              retry_attempted: true,
              last_error_at: new Date().toISOString()
            }
          })
          .eq('id', crawlId);
        
        // Attempt one automatic retry after a delay
        console.log('Attempting automatic retry in 5 seconds...');
        const retryId = crawlId as string; // We know it's defined here
        const retryData = statusData.data;
        const retrySupabase = supabase;
        
        setTimeout(async () => {
          try {
            console.log('🔄 Retrying analysis for crawl:', retryId);
            await analyzeAllPages(retryId, retryData, retrySupabase);
            console.log('✅ Retry successful!');
          } catch (retryErr) {
            console.error('❌ Retry failed:', retryErr);
            const errorMessage = retryErr instanceof Error ? retryErr.message : 'Unknown retry error';
            await retrySupabase
              .from('website_crawls')
              .update({ 
                status: 'error',
                metadata: { 
                  error: errorMessage,
                  retry_failed: true,
                  final_error_at: new Date().toISOString()
                }
              })
              .eq('id', retryId);
          }
        }, 5000);
      });
    }

    // Include time estimate if available
    const metadata = crawl.metadata as any || {};
    
    return new Response(
      JSON.stringify({
        status: crawl.status,
        total_pages: statusData.total || crawl.total_pages,
        crawled_pages: statusData.completed || crawl.crawled_pages,
        analyzed_pages: crawl.analyzed_pages,
        estimated_time_remaining: metadata.estimated_time_remaining,
        firecrawl_status: statusData.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error checking crawl status:', error);
    
    // Try to get current crawl state for graceful degradation
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: crawl } = await supabase
        .from('website_crawls')
        .select('*')
        .eq('id', crawlId)
        .single();
      
      if (crawl) {
        // Return current state instead of hard error
        return new Response(
          JSON.stringify({ 
            status: crawl.status,
            crawled_pages: crawl.crawled_pages || 0,
            analyzed_pages: crawl.analyzed_pages || 0,
            message: 'Temporary error, continuing...'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred',
        should_restart: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Background task to analyze all crawled pages with parallel processing
async function analyzeAllPages(crawlId: string, pages: any[], supabase: any) {
  const totalPages = pages.length;
  console.log(`🚀 Starting comprehensive analysis of ${totalPages} pages for crawl ${crawlId}`);
  
  // Estimate based on hybrid analysis speed (2-3s per page with Claude)
  const estimatedSeconds = Math.ceil((totalPages * 2.5) / 8); // 8 parallel
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
  console.log(`⏱️ Estimated completion: ${estimatedMinutes} minutes (${totalPages} pages, 8 parallel)`);
  
  const LOVABLE_API_KEY = ''; // Not used - using Anthropic directly

  const allViolations: any[] = [];
  const allStrengths: any[] = [];
  let totalScore = 0;
  let analyzedCount = 0;
  const startTime = Date.now();
  
  // Process pages in parallel batches for 5-10x speed improvement
  const BATCH_SIZE = 8; // Process 8 pages simultaneously
  
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pages.length / BATCH_SIZE);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (pages ${i + 1}-${Math.min(i + BATCH_SIZE, totalPages)})`);
    
    // Analyze batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async (page) => {
        try {
          // Fix data structure - Firecrawl uses nested metadata.sourceURL
          const url = page.metadata?.sourceURL || page.sourceURL || 'unknown';
          const html = page.html || '';
          const markdown = page.markdown || '';
          const screenshot = page.screenshot || '';
          const title = page.metadata?.title || page.title || 'Untitled';
          const statusCode = page.metadata?.statusCode || page.statusCode;
          
          // Skip ONLY if it's a clear HTTP error AND looks like error page
          const isHttpError = statusCode && (statusCode === 404 || statusCode >= 500);
          const hasErrorTitle = /<title[^>]*>.*?(404|not found|error).*?<\/title>/i.test(html);
          const isSmallPage = html.length < 2000;
          
          // Only skip if it's clearly an error page (status code + error title + small size)
          if (isHttpError && hasErrorTitle && isSmallPage) {
            console.log(`⚠️ Skipping confirmed error page (${statusCode}): ${url}`);
            return null;
          }
          
          // Skip if absolutely no content
          if (url === 'unknown' || !html || html.length < 100) {
            console.warn(`⚠️ Skipping page with no content: ${url}`);
            return null;
          }
          
          // Classify page type
          const pageType = classifyPageType(url, html);
          
          console.log(`📄 Analyzing: ${url.substring(0, 60)}...`);
          
          // Analyze page using hybrid AI system
          const analysis = await analyzePage(html, markdown, screenshot, LOVABLE_API_KEY);
          
          return {
            url,
            title,
            pageType,
            screenshot,
            analysis,
            html: html.substring(0, 10000),
          };
        } catch (error) {
          const url = page.metadata?.sourceURL || page.sourceURL || 'unknown';
          console.error(`Error analyzing page ${url}:`, error);
          return null;
        }
      })
    );
    
    // Process batch results and store to database
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        const pageData = result.value;
        
        try {
          // Store page analysis
          await supabase.from('page_analyses').insert({
            crawl_id: crawlId,
            page_url: pageData.url,
            page_title: pageData.title,
            page_type: pageData.pageType,
            screenshot: pageData.screenshot,
            score: pageData.analysis.score,
            violations: pageData.analysis.violations,
            strengths: pageData.analysis.strengths,
            html_snapshot: pageData.html,
          });

          // Aggregate results
          allViolations.push(...pageData.analysis.violations);
          allStrengths.push(...pageData.analysis.strengths);
          totalScore += pageData.analysis.score;
          analyzedCount++;
        } catch (dbError) {
          console.error(`Error storing analysis for ${pageData.url}:`, dbError);
        }
      }
    }
    
    // Update progress after each batch with time estimates
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const pagesRemaining = totalPages - analyzedCount;
    const avgSecondsPerPage = analyzedCount > 0 ? elapsedSeconds / analyzedCount : 0.44;
    const estimatedSecondsRemaining = Math.ceil(pagesRemaining * avgSecondsPerPage);
    const estimatedMinutesRemaining = Math.ceil(estimatedSecondsRemaining / 60);
    
    console.log(`Progress: ${analyzedCount}/${totalPages} pages (${Math.round(analyzedCount/totalPages*100)}%)`);
    console.log(`Speed: ${avgSecondsPerPage.toFixed(1)}s/page | ETA: ${estimatedMinutesRemaining} min remaining`);
    
    await supabase
      .from('website_crawls')
      .update({ 
        analyzed_pages: analyzedCount,
        // Store estimated time for frontend display
        metadata: { estimated_time_remaining: `${estimatedMinutesRemaining} min` }
      })
      .eq('id', crawlId);
  }

  // Calculate overall score and deduplicate violations
  const overallScore = analyzedCount > 0 ? Math.round(totalScore / analyzedCount) : 0;
  const uniqueViolations = deduplicateViolations(allViolations);
  const uniqueStrengths = deduplicateStrengths(allStrengths);
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const avgTime = analyzedCount > 0 ? (totalTime / analyzedCount).toFixed(1) : 0;
  
  console.log(`✅ Analysis completed in ${totalTime}s (avg ${avgTime}s/page)`);
  console.log(`   Analyzed: ${analyzedCount}/${totalPages} pages`);
  console.log(`   Overall score: ${overallScore}`);
  console.log(`   Violations: ${uniqueViolations.length} unique types`);
  console.log(`   Strengths: ${uniqueStrengths.length} unique types`);

  // Update crawl with final results
  await supabase
    .from('website_crawls')
    .update({
      status: 'completed',
      overall_score: overallScore,
      aggregate_violations: uniqueViolations,
      aggregate_strengths: uniqueStrengths,
      completed_at: new Date().toISOString(),
      metadata: { 
        total_analysis_time: totalTime,
        avg_time_per_page: avgTime 
      }
    })
    .eq('id', crawlId);
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

// Advanced Hybrid UX Analysis System
// Combines smart rule-based pre-filtering with Claude AI expert analysis
// Designed to rival Baymard Institute's UX analysis tool
async function analyzePage(
  html: string, 
  markdown: string, 
  screenshot: string,
  apiKey: string
): Promise<{ score: number; violations: any[]; strengths: any[] }> {
  console.log(`🔍 Starting hybrid analysis (${html.length} chars HTML)`);
  
  // === PHASE 1: More precise error page detection ===
  // Only skip pages that are CLEARLY error pages, not pages mentioning "404" in content
  const htmlLower = html.toLowerCase();
  const markdownLower = markdown.toLowerCase();
  
  // Check for actual HTTP error pages (title + body content patterns)
  const hasErrorTitle = /<title[^>]*>.*?(404|not found|error).*?<\/title>/i.test(html);
  const hasErrorHeading = /<h1[^>]*>.*?(404|page not found|not found).*?<\/h1>/i.test(html);
  const hasMinimalContent = html.length < 2000; // Error pages are usually small
  const hasErrorClass = /class="[^"]*error-page|404-page/i.test(html);
  
  // Only mark as error if multiple signals indicate it's an error page
  const errorSignals = [
    hasErrorTitle,
    hasErrorHeading && hasMinimalContent,
    hasErrorClass,
    /^(404|error|not found|oops)$/i.test(markdown.trim().split('\n')[0]?.trim() || '')
  ].filter(Boolean).length;
  
  const isErrorPage = errorSignals >= 2;
  
  if (isErrorPage) {
    console.log('⚠️ Error page detected (multiple signals), skipping');
    return { score: 50, violations: [], strengths: [] };
  }
  
  // === PHASE 2: Smart rule-based pre-filtering ===
  // Catches obvious, high-confidence issues before AI analysis
  const criticalViolations: any[] = [];
  
  // Critical accessibility violations (high confidence)
  const images = html.match(/<img/gi) || [];
  const alts = html.match(/alt=/gi) || [];
  if (images.length > 3 && alts.length < images.length * 0.5) {
    criticalViolations.push({
      heuristic: 'Accessibility',
      severity: 'high',
      title: 'Critical: Missing alt text on images',
      description: `${images.length - alts.length} images lack alt attributes, violating WCAG guidelines`,
      location: 'Images throughout page',
      recommendation: 'Add descriptive alt text to all images for screen readers',
      confidence: 0.95
    });
  }
  
  // Missing viewport (mobile responsiveness)
  const hasViewport = /<meta[^>]*viewport/i.test(html);
  if (!hasViewport) {
    criticalViolations.push({
      heuristic: 'Flexibility and efficiency',
      severity: 'high',
      title: 'Critical: No mobile viewport configuration',
      description: 'Missing viewport meta tag will break mobile rendering',
      location: 'HTML <head>',
      recommendation: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1">',
      confidence: 1.0
    });
  }
  
  // Form accessibility
  const forms = html.match(/<form/gi) || [];
  const inputs = html.match(/<input/gi) || [];
  const labels = html.match(/<label/gi) || [];
  if (forms.length > 0 && labels.length < inputs.length * 0.7) {
    criticalViolations.push({
      heuristic: 'Help and documentation',
      severity: 'high',
      title: 'Critical: Form inputs lack labels',
      description: `${inputs.length - labels.length} inputs missing labels (WCAG violation)`,
      location: 'Forms',
      recommendation: 'Associate every input with a label element for accessibility',
      confidence: 0.9
    });
  }
  
  console.log(`⚡ Pre-filter found ${criticalViolations.length} critical issues`);
  
  // === PHASE 3: Claude AI Expert Analysis ===
  // Use Claude Sonnet for deep UX evaluation with vision
  console.log('🤖 Initiating Claude AI analysis...');
  
  let aiViolations: any[] = [];
  let aiStrengths: any[] = [];
  
  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not set, skipping AI analysis');
      throw new Error('No API key');
    }

    const analysisPrompt = `You are a senior UX researcher with expertise in Nielsen's 10 heuristics, WCAG accessibility, and conversion optimization. Analyze this webpage with the rigor of Baymard Institute's UX research.

EVALUATION CRITERIA:
1. Nielsen's 10 Usability Heuristics
2. WCAG 2.1 Accessibility Standards
3. Conversion optimization best practices
4. Mobile UX patterns
5. Cognitive load and information architecture

CRITICAL INSTRUCTIONS:
- Report ONLY actual usability violations (not 404s, server errors, or missing content)
- Focus on functional pages with real user journeys
- Provide specific, actionable recommendations backed by UX research
- Include confidence scores (0.0-1.0) for each finding
- Identify both violations AND strengths

HTML Content:
${html.substring(0, 12000)}

Markdown Content:
${markdown.substring(0, 6000)}

Analyze with expert precision and report findings.`;

    const messages: any[] = [{
      role: 'user',
      content: analysisPrompt
    }];

    // Add screenshot if available
    if (screenshot) {
      messages[0].content = [
        { type: 'text', text: analysisPrompt },
        { 
          type: 'image',
          source: {
            type: 'url',
            url: screenshot
          }
        }
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages,
        tools: [{
          name: 'report_ux_analysis',
          description: 'Report comprehensive UX analysis findings with confidence scores',
          input_schema: {
            type: 'object',
            properties: {
              violations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    heuristic: { type: 'string', description: 'Nielsen heuristic or UX principle' },
                    severity: { type: 'string', enum: ['high', 'medium', 'low'] },
                    title: { type: 'string', description: 'Clear violation title' },
                    description: { type: 'string', description: 'Detailed explanation with user impact' },
                    location: { type: 'string', description: 'Where the issue occurs' },
                    recommendation: { type: 'string', description: 'Specific, actionable fix backed by research' },
                    confidence: { type: 'number', description: 'Confidence score 0.0-1.0' }
                  },
                  required: ['heuristic', 'severity', 'title', 'description', 'location', 'recommendation', 'confidence']
                }
              },
              strengths: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    heuristic: { type: 'string' },
                    description: { type: 'string' },
                    confidence: { type: 'number' }
                  },
                  required: ['heuristic', 'description', 'confidence']
                }
              }
            },
            required: ['violations', 'strengths']
          }
        }],
        tool_choice: { type: 'tool', name: 'report_ux_analysis' }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input) {
        aiViolations = toolUse.input.violations || [];
        aiStrengths = toolUse.input.strengths || [];
        console.log(`✅ Claude found ${aiViolations.length} violations, ${aiStrengths.length} strengths`);
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Claude API error:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Claude analysis failed:', error);
    // Continue with rule-based results
  }
  
  // === PHASE 4: Intelligent result merging ===
  // Combine high-confidence rule violations with AI findings
  // Remove duplicates based on semantic similarity
  const allViolations = [...criticalViolations, ...aiViolations];
  const allStrengths = aiStrengths;
  
  // Deduplicate violations (keep highest confidence version)
  const uniqueViolations = allViolations.reduce((acc, v) => {
    const similar = acc.find((existing: any) => 
      existing.title.toLowerCase().includes(v.title.toLowerCase().substring(0, 20)) ||
      v.title.toLowerCase().includes(existing.title.toLowerCase().substring(0, 20))
    );
    
    if (!similar) {
      acc.push(v);
    } else if ((v.confidence || 0.5) > (similar.confidence || 0.5)) {
      // Replace with higher confidence version
      acc[acc.indexOf(similar)] = v;
    }
    
    return acc;
  }, [] as any[]);
  
  // === PHASE 5: Scoring algorithm ===
  // Weighted scoring based on severity and confidence
  const severityWeights = { high: 20, medium: 10, low: 4 };
  const totalDeductions = uniqueViolations.reduce((sum: number, v: any) => {
    const weight = severityWeights[v.severity as keyof typeof severityWeights] || 10;
    const confidence = v.confidence || 0.7;
    return sum + (weight * confidence);
  }, 0);
  
  const score = Math.max(0, Math.min(100, 100 - totalDeductions));
  
  console.log(`📊 Final: ${score} score | ${uniqueViolations.length} violations | ${allStrengths.length} strengths`);
  
  return {
    score,
    violations: uniqueViolations,
    strengths: allStrengths
  };
}

function deduplicateViolations(violations: any[]): any[] {
  const seen = new Set<string>();
  return violations.filter(v => {
    const key = `${v.heuristic}-${v.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateStrengths(strengths: any[]): any[] {
  const seen = new Set<string>();
  return strengths.filter(s => {
    const key = `${s.heuristic}-${s.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
