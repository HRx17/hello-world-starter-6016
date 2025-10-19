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
    console.log('Firecrawl data:', JSON.stringify(statusData).substring(0, 500));

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
      console.log('Pages data available:', statusData.data ? 'Yes' : 'No');
      console.log('Number of pages:', statusData.data?.length || 0);
      
      // Validate we have data
      if (!statusData.data || statusData.data.length === 0) {
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
        .update({ status: 'analyzing' })
        .eq('id', crawlId);

      // Trigger analysis in background (non-blocking)
      analyzeAllPages(crawlId, statusData.data, supabase).catch(err => {
        console.error('Background analysis error:', err);
        // Update status to error if analysis fails
        supabase
          .from('website_crawls')
          .update({ 
            status: 'error',
            metadata: { error: err.message }
          })
          .eq('id', crawlId);
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Background task to analyze all crawled pages with parallel processing
async function analyzeAllPages(crawlId: string, pages: any[], supabase: any) {
  const totalPages = pages.length;
  console.log(`Analyzing ${totalPages} pages for crawl ${crawlId}`);
  
  // Calculate and log estimated time (3.5s per page with 8 parallel = ~0.44s per page effective)
  const estimatedSeconds = Math.ceil((totalPages * 3.5) / 8);
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
  console.log(`Estimated completion time: ${estimatedMinutes} minutes (${totalPages} pages, 8 parallel)`);
  
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return;
  }

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
          
          // Skip if no URL
          if (url === 'unknown' || !html) {
            console.warn('Skipping page with missing data');
            return null;
          }
          
          // Classify page type
          const pageType = classifyPageType(url, html);
          
          // Analyze page using hybrid system (use flash for speed in parallel mode)
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

async function analyzePage(html: string, markdown: string, screenshot: string, apiKey: string) {
  // FULL AI ANALYSIS PIPELINE - Same as single-page analysis
  
  // First, check for error pages and skip analysis
  const htmlLower = html.toLowerCase();
  const markdownLower = markdown.toLowerCase();
  
  const isErrorPage = 
    htmlLower.includes('404') || 
    htmlLower.includes('page not found') ||
    htmlLower.includes('error') && (htmlLower.includes('500') || htmlLower.includes('403')) ||
    markdownLower.includes('404') ||
    markdownLower.includes('page not found');
  
  if (isErrorPage) {
    console.log('Skipping error page from analysis');
    return {
      score: 100,
      violations: [],
      strengths: [],
    };
  }
  
  // Step 1: Rule-based pattern detection (deterministic baseline)
  const ruleBasedViolations: any[] = [];
  const ruleBasedStrengths: any[] = [];
  
  for (const uiPattern of UI_PATTERN_DATABASE) {
    for (const badPattern of uiPattern.badPatterns) {
      if (detectPattern(html, badPattern)) {
        ruleBasedViolations.push({
          heuristic: uiPattern.heuristics[0] || "General UX",
          severity: badPattern.severity,
          title: badPattern.description,
          description: `${uiPattern.component}: ${badPattern.description}`,
          location: uiPattern.component,
          recommendation: badPattern.recommendation,
        });
      }
    }
    
    // Detect strengths (good patterns)
    for (const goodPattern of uiPattern.goodPatterns) {
      if (detectPattern(html, goodPattern)) {
        ruleBasedStrengths.push({
          heuristic: uiPattern.heuristics[0] || "General UX",
          description: `${uiPattern.component}: ${goodPattern.description}`,
        });
      }
    }
  }

  // Step 2: AI Vision-Based Classification using Gemini Pro
  let aiViolations: any[] = [];
  let aiStrengths: any[] = [];
  
  if (screenshot && apiKey) {
    try {
      // Stage 1: UI Pattern Classification with Vision
      const classificationPrompt = `Analyze this screenshot and HTML to identify UI patterns. Focus on:
1. Navigation structure and usability
2. Form design and validation
3. Button/CTA visibility and clarity
4. Error messaging approach
5. Loading states and feedback
6. Modal/dialog design

For each UI element, provide:
- Element type and purpose
- Visual location (percentage-based coordinates: x, y, width, height where 0-100)
- Usability assessment

Provide bounding boxes for ALL identified issues.`;

      const classificationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: classificationPrompt },
                { type: 'image_url', image_url: { url: screenshot } }
              ]
            }
          ],
          temperature: 0.1,
        })
      });

      if (classificationResponse.ok) {
        const classificationData = await classificationResponse.json();
        const classification = classificationData.choices?.[0]?.message?.content || '';

        // Stage 2: Heuristic Evaluation using Gemini Flash
        const evaluationPrompt = `Based on Nielsen's 10 Usability Heuristics, evaluate this page.

SCREENSHOT ANALYSIS:
${classification}

HTML STRUCTURE:
${html.substring(0, 5000)}

CRITICAL INSTRUCTIONS:
- Do NOT flag 404 errors, page not found errors, or HTTP status code issues
- Do NOT flag missing content or empty states that are intentional
- ONLY flag actual usability violations that affect user experience
- Focus on UI/UX issues like navigation, forms, buttons, feedback, consistency

Identify 5-8 specific violations with:
1. Exact heuristic violated (from Nielsen's 10)
2. Severity (high/medium/low)
3. Specific title
4. Detailed description of the UX issue
5. Location on page
6. Actionable recommendation
7. Bounding box coordinates (x, y, width, height as percentages 0-100)

Also identify 3-5 strengths where heuristics are followed well.`;

        const evaluationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: evaluationPrompt }],
            tools: [{
              type: "function",
              function: {
                name: "evaluate_usability",
                description: "Return structured heuristic evaluation",
                parameters: {
                  type: "object",
                  properties: {
                    violations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          heuristic: { type: "string" },
                          severity: { type: "string", enum: ["high", "medium", "low"] },
                          title: { type: "string" },
                          description: { type: "string" },
                          location: { type: "string" },
                          recommendation: { type: "string" },
                          boundingBox: {
                            type: "object",
                            properties: {
                              x: { type: "number" },
                              y: { type: "number" },
                              width: { type: "number" },
                              height: { type: "number" }
                            }
                          }
                        },
                        required: ["heuristic", "severity", "title", "description", "location", "recommendation"]
                      }
                    },
                    strengths: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          heuristic: { type: "string" },
                          description: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "evaluate_usability" } }
          })
        });

        if (evaluationResponse.ok) {
          const evaluationData = await evaluationResponse.json();
          const toolCall = evaluationData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const evaluation = JSON.parse(toolCall.function.arguments);
            aiViolations = evaluation.violations || [];
            aiStrengths = evaluation.strengths || [];
          }
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fall back to rule-based only
    }
  }

  // Step 3: Combine rule-based and AI violations
  const allViolations = [...ruleBasedViolations, ...aiViolations];
  const allStrengths = [...ruleBasedStrengths, ...aiStrengths];

  // Step 4: Calculate weighted score
  let score = 100;
  
  allViolations.forEach(v => {
    const weights: { [key: string]: number } = { high: 12, medium: 6, low: 3 };
    score -= weights[v.severity] || 5;
  });
  
  // Bonus for strengths (up to +10)
  const strengthBonus = Math.min(10, allStrengths.length * 2);
  score += strengthBonus;
  
  // Clamp between 40-100
  score = Math.max(40, Math.min(100, Math.round(score)));

  return {
    score,
    violations: allViolations,
    strengths: allStrengths,
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
