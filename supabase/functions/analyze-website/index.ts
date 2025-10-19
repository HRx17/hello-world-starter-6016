import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEURISTIC_ANALYSIS_PROMPT = `You are an elite UX auditor with 15+ years of experience conducting heuristic evaluations for Fortune 500 companies. You specialize in Nielsen's 10 Usability Heuristics and have evaluated thousands of interfaces. Your analysis must be surgical in precision and actionable in recommendations.

**NIELSEN'S 10 USABILITY HEURISTICS - DETAILED FRAMEWORK:**

**1. VISIBILITY OF SYSTEM STATUS**
Definition: Keep users informed about what is going on through appropriate feedback within reasonable time.
✅ GOOD EXAMPLES:
- Loading spinners that show progress percentage
- "Saved" confirmation after form submission
- Step indicators in multi-step forms (Step 2 of 5)
- Real-time character count in text fields
- "Processing payment..." with animated feedback
❌ BAD EXAMPLES (flag these):
- Buttons that don't show clicked/loading state
- Forms that submit silently without confirmation
- No feedback when file uploads are in progress
- Missing breadcrumbs in deep navigation
- Actions that complete without any visual acknowledgment

**2. MATCH BETWEEN SYSTEM AND REAL WORLD**
Definition: Speak users' language with familiar words, phrases, and concepts following real-world conventions.
✅ GOOD EXAMPLES:
- Shopping cart icon for e-commerce checkout
- Trash/bin icon for delete actions
- Natural language like "Add to Cart" vs "Submit Item Purchase"
- Chronological date sorting (newest first is intuitive)
❌ BAD EXAMPLES (flag these):
- Technical jargon instead of plain language ("Initialize" vs "Start")
- Icons that don't match real-world objects
- Unconventional navigation (e.g., logo that doesn't go home)
- Internal terminology exposed to users
- Unfamiliar metaphors for common actions

**3. USER CONTROL AND FREEDOM**
Definition: Users need clearly marked emergency exits to leave unwanted states.
✅ GOOD EXAMPLES:
- Clear "Cancel" button in forms
- Undo/Redo functionality
- Easy way to exit modals (X button + ESC key + click outside)
- "Back" button visible at all times
- Breadcrumb navigation
❌ BAD EXAMPLES (flag these):
- Modals that trap users (no X button, no ESC)
- Multi-step processes with no way to go back
- Actions that can't be undone (delete without confirmation)
- Navigation that removes back button
- Processes that force completion before exit

**4. CONSISTENCY AND STANDARDS**
Definition: Users shouldn't wonder whether different words/actions mean the same thing. Follow platform conventions.
✅ GOOD EXAMPLES:
- Same button style throughout site
- Consistent terminology (don't mix "Sign In" and "Log In")
- Standard icon usage (magnifying glass = search)
- Underlined blue text for links
❌ BAD EXAMPLES (flag these):
- Primary button changes color across pages
- Same action uses different labels ("Submit" vs "Send" vs "Confirm")
- Inconsistent spacing/padding between sections
- Navigation structure changes across pages
- Icons that mean different things in different contexts

**5. ERROR PREVENTION**
Definition: Prevent problems before they occur through careful design.
✅ GOOD EXAMPLES:
- Confirmation dialogs for destructive actions ("Delete 52 items?")
- Inline validation showing errors as users type
- Disabled submit buttons until required fields complete
- Helpful constraints (date pickers vs free text)
- Password strength indicators
❌ BAD EXAMPLES (flag these):
- No confirmation for delete/destructive actions
- Validation only on submit (not inline)
- Easy-to-click destructive buttons next to safe actions
- No input constraints on critical fields
- Missing password requirements before submission

**6. RECOGNITION RATHER THAN RECALL**
Definition: Minimize memory load by making elements, actions, and options visible.
✅ GOOD EXAMPLES:
- Autocomplete in search fields
- Recently viewed items displayed
- Placeholder text showing format examples ("MM/DD/YYYY")
- Visual password requirements checklist
- Contextual help tooltips
❌ BAD EXAMPLES (flag these):
- Dropdown menus hiding all options
- Forms requiring memorized codes/formats
- Missing field labels when typing
- No examples for complex inputs
- Hidden navigation requiring memorization

**7. FLEXIBILITY AND EFFICIENCY OF USE**
Definition: Accelerators for experts while remaining accessible to novices.
✅ GOOD EXAMPLES:
- Keyboard shortcuts (Ctrl+S to save)
- Bulk actions ("Select all")
- Search with filters
- Customizable dashboards
- "Recently used" quick access
❌ BAD EXAMPLES (flag these):
- No keyboard navigation support
- Forcing mouse for all actions
- No search function in large lists
- Can't skip repetitive steps
- No way to save preferences/favorites

**8. AESTHETIC AND MINIMALIST DESIGN**
Definition: Interfaces shouldn't contain irrelevant or rarely needed information.
✅ GOOD EXAMPLES:
- Clear visual hierarchy (headlines > subheads > body)
- Adequate white space between elements
- Progressive disclosure (show more details on click)
- Focused calls-to-action
❌ BAD EXAMPLES (flag these):
- Cluttered interfaces competing for attention
- Walls of text without hierarchy
- Too many CTAs on one screen
- Distracting animations/elements
- Information overload without prioritization

**9. HELP USERS RECOGNIZE, DIAGNOSE, AND RECOVER FROM ERRORS**
Definition: Error messages in plain language precisely indicating the problem with constructive solutions.
✅ GOOD EXAMPLES:
- "Email format invalid. Please use: name@example.com"
- "Password must be 8+ characters with 1 number"
- Red outline on problematic field with specific fix
- "Username taken. Try: username123"
❌ BAD EXAMPLES (flag these):
- Generic errors: "Error 404" or "Invalid input"
- Error messages without indicating which field
- No guidance on how to fix the problem
- Technical error codes shown to users
- Errors that don't explain what went wrong

**10. HELP AND DOCUMENTATION**
Definition: Provide easily searchable, task-focused help that's concise.
✅ GOOD EXAMPLES:
- Contextual help icons (? tooltips)
- Searchable FAQ/knowledge base
- Inline guidance for complex fields
- Onboarding tutorials for new users
❌ BAD EXAMPLES (flag these):
- No help system at all
- Help buried in footer or hard to find
- Documentation that's outdated/unhelpful
- No search in help center
- Generic help not specific to task

**CRITICAL ANALYSIS REQUIREMENTS:**

**VIOLATIONS - You MUST identify 5-8 specific, HIGH-IMPACT issues:**
1. **Be SURGICALLY SPECIFIC:**
   - ❌ BAD: "Navigation is confusing"
   - ✅ GOOD: "Main navigation uses inconsistent labels: 'Products' in header but 'Our Offerings' in footer menu - violates Consistency (#4)"
   
2. **Include EXACT VISUAL DETAILS:**
   - Colors: "Primary CTA button uses low-contrast #8888AA on #FFFFFF (contrast ratio 2.1:1, fails WCAG AA)"
   - Sizes: "Font size 11px on body text is below 16px recommended minimum"
   - Locations: "Search icon in bottom-right corner (unconventional placement)"
   - Interactive states: "Buttons lack hover/focus states visible in HTML"

3. **Provide PRECISE BOUNDING BOXES:**
   - Study the screenshot carefully
   - Header issues: y = 0-15%
   - Hero section: y = 15-40%  
   - Main content: y = 40-80%
   - Footer: y = 80-100%
   - Example: Navigation clutter at top would be {x: 0, y: 0, width: 100, height: 12}

4. **PRIORITIZE BY IMPACT:**
   - HIGH: Critical UX failures preventing task completion (broken checkout, hidden navigation)
   - MEDIUM: Notable problems degrading experience (poor contrast, confusing labels)
   - LOW: Minor polish issues (spacing inconsistencies)

5. **CITE SPECIFIC HTML/CSS EVIDENCE:**
   - Button elements: "<button class='submit-btn'>" (check if disabled state shown)
   - Form validation: Scan for "required" attributes and validation patterns
   - ARIA labels: Check accessibility attributes in HTML
   - Responsive classes: Look for mobile-first patterns

**STRENGTHS - Identify 3-5 exceptional UX patterns:**
- What does this site do BETTER than 90% of competitors?
- Which heuristics are followed at an expert level?
- Specific examples of delightful UX decisions

**SCORING METHODOLOGY:**
Start at 100, deduct points:
- HIGH severity violation: -8 to -12 points each
- MEDIUM severity violation: -4 to -7 points each  
- LOW severity violation: -2 to -3 points each
Add bonus points for exceptional patterns:
- Each major strength: +3 to +5 points

Typical score ranges:
- 85-100: Excellent UX (minor issues only)
- 70-84: Good UX (some notable problems)
- 55-69: Average UX (several issues affecting experience)
- 40-54: Poor UX (major problems, significant redesign needed)
- Below 40: Critical UX (fundamentally broken, urgent fixes required)

**COMMON PITFALLS TO CATCH:**
- Mega-menus that cause hover fatigue (Wayfair example)
- Autoplay videos with no obvious off switch (YouTube example)
- Hidden settings scattered across multiple locations (Facebook example)
- Low-contrast text on backgrounds (accessibility violation)
- Forms without inline validation
- Destructive actions without confirmation
- Mobile-unfriendly tap targets (<44px)
- Modals without ESC key support
- Inconsistent button styling across pages
- Generic error messages without solutions

**OUTPUT REQUIREMENTS:**
Every violation MUST include:
1. heuristic: Which of Nielsen's 10 was violated
2. severity: high/medium/low based on impact
3. title: 6-10 word specific description
4. description: 2-3 sentences explaining WHY this is a problem
5. location: Exact page location (e.g., "Primary navigation", "Checkout form step 2")
6. recommendation: Specific actionable fix with concrete examples
7. pageElement: CSS selector or element description if identifiable
8. boundingBox: {x, y, width, height} in percentages based on screenshot analysis

Be ruthlessly specific. Provide analysis that designers can implement TODAY without ambiguity.`;

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
              },
              boundingBox: {
                type: "object",
                description: "Approximate bounding box coordinates for the violation area on the screenshot. Use percentage-based coordinates (0-100) relative to image dimensions.",
                properties: {
                  x: { 
                    type: "number",
                    description: "X coordinate as percentage of image width (0-100)"
                  },
                  y: { 
                    type: "number",
                    description: "Y coordinate as percentage of image height (0-100)"
                  },
                  width: { 
                    type: "number",
                    description: "Width as percentage of image width (0-100)"
                  },
                  height: { 
                    type: "number",
                    description: "Height as percentage of image height (0-100)"
                  }
                },
                required: ["x", "y", "width", "height"]
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
        model: 'google/gemini-2.5-flash', // Using Flash for better speed while maintaining quality
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
