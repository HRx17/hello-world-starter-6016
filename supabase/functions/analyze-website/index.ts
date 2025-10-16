import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEURISTIC_ANALYSIS_PROMPT = `You are a senior UX auditor specializing in Nielsen's 10 Usability Heuristics. Analyze the website with extreme precision:

**Nielsen's 10 Heuristics:**
1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

**Analysis Requirements:**

VIOLATIONS - Identify 3-7 specific issues:
- Include EXACT locations (header, footer, specific sections)
- Mention ACTUAL UI elements (button text, form labels, navigation items)
- Reference COLORS, SIZES, SPACING when relevant
- Note INTERACTIVE elements (hover states, modals, dropdowns visible in HTML)
- Specify CSS SELECTORS when identifiable
- Focus on HIGH-IMPACT issues first, then medium, then low

STRENGTHS - Identify 3-5 positive patterns:
- What does the site do EXCEPTIONALLY well?
- Which heuristics are STRONGLY followed?
- Specific examples of good UX decisions

RECOMMENDATIONS - Must be:
- ACTIONABLE: Designers can implement without guessing
- SPECIFIC: Include exact changes ("Change button from X to Y")
- PRIORITIZED: Most critical fixes first
- MEASURABLE: Clear success criteria when possible

**Critical Analysis Areas:**
- Navigation clarity and information architecture
- Form design and input validation cues
- Error messaging and system feedback
- Visual hierarchy and scanability  
- Mobile responsiveness indicators (check HTML for viewport meta, responsive classes)
- Accessibility red flags (contrast, alt text, ARIA in HTML)
- Loading states and progress indicators
- Call-to-action prominence and clarity
- Consistency of patterns across page sections

Be ruthlessly specific. Avoid generic feedback like "improve readability" - instead say "Increase line-height from 1.2 to 1.6 on body text for better scanability".`;

const HEURISTIC_EVALUATION_TOOL = {
  type: "function",
  function: {
    name: "heuristic_evaluation",
    description: "Return structured heuristic evaluation results",
    parameters: {
      type: "object",
      properties: {
        overallScore: {
          type: "number",
          description: "Overall usability score 0-100 based on violations and strengths"
        },
        violations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heuristic: { 
                type: "string",
                description: "One of Nielsen's 10 heuristics that was violated"
              },
              severity: { 
                type: "string", 
                enum: ["high", "medium", "low"],
                description: "Impact level: high = critical UX issue, medium = notable problem, low = minor issue"
              },
              title: { 
                type: "string",
                description: "Short, specific title for the violation"
              },
              description: { 
                type: "string",
                description: "Detailed explanation of why this is a problem"
              },
              location: { 
                type: "string",
                description: "Where on the page this issue occurs (e.g., 'Navigation bar', 'Checkout button')"
              },
              recommendation: { 
                type: "string",
                description: "Specific, actionable fix the designer can implement"
              },
              pageElement: { 
                type: "string",
                description: "CSS selector or element description if identifiable"
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
              heuristic: { 
                type: "string",
                description: "One of Nielsen's 10 heuristics that was followed well"
              },
              description: { 
                type: "string",
                description: "What the website does well in this area"
              }
            },
            required: ["heuristic", "description"]
          }
        }
      },
      required: ["overallScore", "violations", "strengths"]
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log('Starting analysis for URL:', url);

    // Step 1: Scrape with Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    console.log('Calling Firecrawl API...');
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['html', 'markdown', 'screenshot'],
        onlyMainContent: false,
        includeTags: ['a', 'button', 'input', 'form', 'nav', 'header', 'footer'],
        waitFor: 2000, // Wait for dynamic content to load
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl error:', errorText);
      throw new Error(`Firecrawl failed: ${firecrawlResponse.status}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    console.log('Firecrawl successful');

    const { html, markdown, screenshot, metadata } = firecrawlData.data;
    const websiteName = metadata?.title || new URL(url).hostname;

    // Step 2: AI Analysis with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: HEURISTIC_ANALYSIS_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this website: ${url}

**Website Title:** ${websiteName}

**Page Content (Markdown):**
${markdown.substring(0, 5000)}

**Key HTML Elements to Inspect:**
${html.substring(0, 3000)}

Look for:
- Interactive elements (buttons, forms, links, modals)
- Navigation structure and patterns
- Form inputs and validation cues
- Error messages or system feedback
- Loading indicators or skeleton screens
- Mobile/responsive design patterns
- ARIA labels and accessibility attributes
- Color contrast issues (if visible in screenshot)

Provide a thorough, specific analysis focusing on the most impactful UX issues.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshot
                }
              }
            ]
          }
        ],
        tools: [HEURISTIC_EVALUATION_TOOL],
        tool_choice: { type: 'function', function: { name: 'heuristic_evaluation' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI analysis successful');

    const toolCall = aiData.choices[0].message.tool_calls[0];
    const evaluation = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        websiteName,
        overallScore: evaluation.overallScore,
        violations: evaluation.violations,
        strengths: evaluation.strengths,
        screenshot,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-website function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
