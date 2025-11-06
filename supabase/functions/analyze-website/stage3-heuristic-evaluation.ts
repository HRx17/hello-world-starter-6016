// Stage 3: Per-Heuristic Evaluation
// Each heuristic gets its own focused AI analysis with specific evidence

import type { VisualElement } from './stage1-visual-decomposition.ts';
import type { StructuralFindings } from './stage2-structural-analysis.ts';

interface HeuristicViolation {
  heuristic: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  pageElement: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  researchBacking: string;
  userImpact: string;
}

interface HeuristicStrength {
  heuristic: string;
  description: string;
  example: string;
}

const HEURISTIC_SPECIFIC_PROMPTS: Record<string, string> = {
  "visibility": `**ACT LIKE A HUMAN: System Status Visibility**

You're a user on this website. Look at the screenshot carefully.

**STRENGTHS TO RECOGNIZE (Report these!):**
✅ Shopping cart badge shows item count
✅ Active page highlighted in navigation
✅ Breadcrumbs show current location
✅ Progress bars or step indicators visible
✅ Clear loading states or spinners
✅ "Added to cart" or similar confirmation messages visible
✅ Search results show "Found X results" or similar feedback

**ISSUES TO FLAG:**
1. If I clicked a button, would I know something is happening?
   - Flag if: Buttons look the same before/after click, no visual feedback

2. Can I tell where I am in the site?
   - Flag if: All nav items look identical, no way to know current location

3. If I'm waiting for something (search, file upload), do I know it's working?
   - Flag if: No indication of progress or time remaining

4. Can I see the results of my actions?
   - Flag if: Actions seem to happen silently with no confirmation

**IGNORE:** 
- HTML attributes, meta tags, console logs
- Backend status codes
- Things not visible to the user

**REPORT:** 
Both strengths AND issues related to system status visibility`,

  "match_real_world": `**ACT LIKE A HUMAN: Real-World Language & Conventions**

Imagine you're a typical user (not a developer) looking at this website.

**STRENGTHS TO RECOGNIZE:**
✅ Clear, descriptive button labels ("Add to Cart", "Check Out")
✅ Familiar icons (shopping cart, search, home) with good labels
✅ Plain language that a non-technical person understands
✅ Logo in top-left (clickable to home) - industry convention
✅ Footer at bottom with expected links (About, Contact, Privacy)
✅ Breadcrumbs or clear navigation following standard patterns

**ISSUES TO FLAG:**
1. Do I understand what these buttons do?
   - Flag if: Button labels are generic, vague, or use programming terms ("Submit", "Execute", "Process")

2. Can I understand the icons without hovering?
   - Flag if: Abstract icons with no text labels, unfamiliar symbols

3. Is the language familiar or does it feel like "computer speak"?
   - Flag if: Jargon, unexplained acronyms, technical terms ("Authenticate", "Config", "Log entries")

4. Do visual patterns match real-world expectations?
   - Flag if: Logo not top-left, unusual navigation, unexpected button positions

**IGNORE:** Variable names, code comments, HTML structure
**REPORT:** Both good and bad examples of real-world language matching`,

  "user_control": `**VISUAL ANALYSIS: User Control & Freedom**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Modal dialogs with no visible close button (X)
- Multi-step processes with no back button
- Destructive actions (delete, remove) with no undo option
- Forms that can't be abandoned easily

✅ WHAT TO LOOK FOR:
- Are there visible exit paths from all workflows?
- Can users see how to go back?
- Are there undo options for important actions?

IGNORE: Browser back button functionality
REPORT: Only missing VISIBLE control elements`,

  "consistency": `**ACT LIKE A HUMAN: Consistency & Pattern Recognition**

As you scan this page, your brain naturally looks for patterns. Notice what feels "off" or inconsistent.

**1. BUTTON CONSISTENCY:**
   - Look at ALL buttons on the page
   - Do primary action buttons look the same? (same color, size, style)
   - Do secondary buttons have a consistent alternative style?
   - Flag if: Similar actions use different button styles, or same-looking buttons do different things

**2. SPACING & ALIGNMENT:**
   - Look at margins and padding around elements
   - Do similar sections have similar spacing?
   - Are elements aligned properly? (left-aligned text, centered headings, etc.)
   - Flag if: Spacing is random, elements are misaligned, no consistent grid

**3. NAVIGATION PATTERNS:**
   - Look at the navigation menu/header
   - Is it positioned consistently? (always top, always same height)
   - Do navigation items have consistent styling?
   - Flag if: Nav items vary in size/style, or navigation appears differently across sections

**4. ICON USAGE:**
   - Do the same types of actions use the same icons?
   - Are icon styles consistent? (all outline, or all filled, not mixed)
   - Flag if: Delete action uses different icons in different places, or icon styles clash

**5. COLOR MEANING:**
   - If red is used for "delete/danger", is it used consistently?
   - If blue is used for primary actions, is it used consistently?
   - Flag if: Same color means different things, or same action uses different colors

**6. TYPOGRAPHY:**
   - Are heading levels visually distinct and consistent?
   - Is body text the same size throughout?
   - Flag if: H2s look different in different sections, random font size variations

**7. VISUAL PATTERNS:**
   - Do cards/containers have consistent styling?
   - Are similar content types presented similarly?
   - Flag if: Same type of content looks completely different in different places

**IGNORE:** CSS class names, code structure
**REPORT:** Visual inconsistencies that would make a user think "why does this button look different?" or feel confused by varying patterns`,

  "error_prevention": `**VISUAL ANALYSIS: Error Prevention**

Look at the SCREENSHOT and identify:

✅ STRENGTHS TO RECOGNIZE:
- Confirmation dialogs before destructive actions ("Are you sure you want to delete?")
- Required fields marked with asterisks or "(required)" labels
- Password strength indicators visible while typing
- Format examples shown in placeholder or helper text ("MM/DD/YYYY")
- Visual constraints shown ("Password must be 8+ characters")
- Disabled submit buttons until form is valid
- Autocomplete or suggestions to prevent typos

❌ ISSUES TO FLAG:
- Destructive actions (delete, clear) with no visible confirmation
- Required fields not visually marked
- Input constraints hidden (user must discover through trial-and-error)
- Date/email inputs without format guidance
- No prevention of common errors

IGNORE: HTML5 validation attributes, backend validation
REPORT: Only VISIBLE prevention mechanisms (or lack thereof)`,

  "recognition": `**VISUAL ANALYSIS: Recognition Rather Than Recall**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Input placeholders disappear when typing (no persistent label)
- Icons without visible text labels
- No autocomplete suggestions visible
- Hidden format requirements (users must remember)
- Toolbar icons that require memorization

✅ WHAT TO LOOK FOR:
- Do labels stay visible when interacting?
- Are options and commands visible?
- Do icons have text labels?

IGNORE: ARIA labels, screen reader text
REPORT: Only what sighted users can SEE`,

  "flexibility": `**VISUAL ANALYSIS: Flexibility & Efficiency**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- No visible search functionality
- No bulk action buttons (must act on items one by one)
- No keyboard shortcuts indicated in UI
- No "quick actions" or shortcuts visible

✅ WHAT TO LOOK FOR:
- Are there visible efficiency tools?
- Can users see shortcuts?
- Are there advanced features for power users?

IGNORE: Backend optimizations, responsive code
REPORT: Only missing VISIBLE efficiency features`,

  "minimalist": `**ACT LIKE A HUMAN: First Impression & Visual Design**

Look at this screenshot as if you just landed on the website. Be honest about your gut reaction.

**1. FIRST 3-SECOND IMPRESSION:**
   - Does this look modern (2024-2025 design) or outdated (2010s or earlier)?
   - What year does this design feel like it's from?
   - Does it feel cluttered or clean?
   - Do you feel overwhelmed or at ease?

**2. DATED DESIGN PATTERNS (Flag these immediately):**
   - ❌ Heavy gradients with shine/gloss effects
   - ❌ Beveled or embossed elements (3D-looking buttons)
   - ❌ Heavy drop shadows or inner shadows
   - ❌ Overly saturated, bright colors (especially web-safe color palettes)
   - ❌ Decorative dividers, ornate borders
   - ❌ Stock photo montages or cheesy imagery
   - ❌ Flash-era design (glossy buttons, reflections)

**3. SPATIAL ANALYSIS (Look at the layout):**
   - Is there enough whitespace / breathing room?
   - Are elements crammed together?
   - Do related items have appropriate proximity?
   - Is there a clear visual hierarchy or does everything compete for attention?
   - Are there awkward gaps or inconsistent spacing?

**4. VISUAL HIERARCHY:**
   - Can you immediately tell what's most important on the page?
   - Is there one clear primary action/CTA?
   - Or are there 5 different things screaming for attention?
   - Are font sizes and weights used to create clear levels of importance?

**5. INFORMATION DENSITY:**
   - Is there too much text/content crammed in?
   - Are paragraphs long and intimidating?
   - Is the page trying to say too many things at once?
   - Would a user feel exhausted looking at this?

**6. COLOR & AESTHETICS:**
   - Is the color palette tasteful and modern?
   - Do colors clash or compete?
   - Is there good contrast without being harsh?
   - Does the design feel cohesive?

**CRITICAL: Be brutally honest about dated designs.**
Many websites have "Web 2.0" or early 2010s aesthetics that desperately need updates. Flag these clearly.

**IGNORE:** Code optimization, file sizes
**REPORT:** Visual clutter, outdated aesthetics, poor spatial design - what would make a user think "this looks old"`,

  "error_recovery": `**VISUAL ANALYSIS: Error Recognition & Recovery**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Generic error messages ("Error occurred")
- Error messages in technical language (HTTP 500)
- Errors that don't explain how to fix the problem
- Error messages that are hard to notice

✅ WHAT TO LOOK FOR:
- Are error messages clear and helpful?
- Do they explain what went wrong?
- Do they suggest how to fix it?

IGNORE: Console errors, network tab
REPORT: Only user-facing error messages`,

  "help_documentation": `**VISUAL ANALYSIS: Help & Documentation**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Complex interfaces with no visible help
- No tooltips or info icons for unclear features
- No onboarding for first-time users
- Help hidden in menus users won't find

✅ WHAT TO LOOK FOR:
- Are there visible help elements?
- Are tooltips available for complex features?
- Is contextual help accessible?

IGNORE: Developer docs, README files
REPORT: Only missing VISIBLE help for end users`
};

export async function evaluatePerHeuristic(
  heuristicKey: string,
  heuristicName: string,
  visualData: any,
  structuralData: StructuralFindings,
  screenshot: string,
  html: string,
  markdown: string,
  apiKey: string,
  interactionContext: string = ''
): Promise<{ violations: HeuristicViolation[]; strengths: HeuristicStrength[] }> {
  console.log(`Stage 3: Evaluating heuristic: ${heuristicName}`);
  
  // Validate and prepare screenshot data
  let screenshotData: string;
  if (screenshot.startsWith('data:image')) {
    const parts = screenshot.split(',');
    screenshotData = parts.length > 1 ? parts[1] : screenshot;
  } else {
    screenshotData = screenshot;
  }
  
  if (!screenshotData || screenshotData.length < 100) {
    console.error(`Heuristic ${heuristicKey}: Screenshot data invalid (${screenshotData?.length || 0} bytes)`);
    return { violations: [], strengths: [] };
  }

  const prompt = HEURISTIC_SPECIFIC_PROMPTS[heuristicKey] || HEURISTIC_SPECIFIC_PROMPTS["visibility"];

  const contextData = `
**VISUAL ELEMENTS DETECTED:**
${JSON.stringify(visualData, null, 2).substring(0, 3000)}

**PAGE CONTENT (for context only):**
${markdown.substring(0, 1000)}

${interactionContext}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { 
                text: `You are a Nielsen Norman Group UX expert analyzing this website screenshot for heuristic: ${heuristicName}

${prompt}

**OUTPUT FORMAT (STRICT JSON):**
For EACH violation you must provide ALL these fields:
{
  "violations": [
    {
      "severity": "high|medium|low",
      "title": "Specific descriptive title (minimum 6 words)",
      "description": "What's wrong and why it matters (minimum 30 words)",
      "location": "Exact location on page (e.g., 'Top navigation bar', 'Main content area, above fold')",
      "pageElement": "Specific element (e.g., 'Search button', 'Primary CTA button', NOT 'button')",
      "recommendation": "Actionable fix (minimum 20 words)",
      "researchBacking": "Nielsen Norman Group or similar research citation (minimum 25 characters)",
      "userImpact": "Quantified user impact (e.g., 'Reduces task success by 30%', 'Increases cognitive load significantly')"
    }
  ],
  "strengths": [
    {
      "description": "What's done well and why it's effective (minimum 20 words)",
      "example": "Specific example from the page with location"
    }
  ]
}

**CRITICAL RULES FOR BALANCED ANALYSIS:**
1. Base analysis 95% on SCREENSHOT, 5% on text content
2. BE BALANCED: Report both violations AND strengths. World-class sites like Amazon should show many strengths.
3. DO NOT report: meta tags, HTML attributes, ARIA labels, viewport, alt text, semantic HTML
4. DO report: outdated visual design, poor visual hierarchy, cluttered layouts, unclear UI elements
5. ONLY flag genuine issues - don't invent problems if the UX is good
6. For mature sites (Amazon, Google, etc.), expect to find MORE strengths than violations
7. Every violation needs ALL fields above or it will be rejected
8. Title must be specific (>6 words), not generic
9. Research backing must cite specific UX research
10. User impact must quantify the problem
11. Strengths must be detailed (>20 words) and specific

Context (for reference only):
${contextData}

Now analyze the SCREENSHOT and return JSON with visual UX issues only.`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: screenshotData
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Heuristic ${heuristicKey} API error ${response.status}:`, errorText);
      return { violations: [], strengths: [] };
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    
    const violations = (result.violations || []).map((v: any) => ({
      ...v,
      heuristic: heuristicName
    }));

    const strengths = (result.strengths || []).map((s: any) => ({
      ...s,
      heuristic: heuristicName
    }));

    console.log(`  Found ${violations.length} violations, ${strengths.length} strengths`);
    return { violations, strengths };
  } catch (error) {
    console.error(`Error evaluating ${heuristicKey}:`, error);
    return { violations: [], strengths: [] };
  }
}
