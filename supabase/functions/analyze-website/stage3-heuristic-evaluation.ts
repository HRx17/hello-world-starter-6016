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
  "visibility": `**VISUAL ANALYSIS: System Status Visibility**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Generic loading spinners with no progress indication
- No feedback when clicking buttons (no visual state change)
- Current page not highlighted in navigation
- Form submissions with no loading state
- File uploads with no progress bar
- Search with no indication it's processing

✅ WHAT TO LOOK FOR:
- Are there visual loading indicators?
- Do buttons show hover/active states?
- Is the current page visually distinct in navigation?
- Do users know when the system is processing?

IGNORE: HTML meta tags, console logs, network requests
REPORT: Only missing VISIBLE feedback elements`,

  "match_real_world": `**VISUAL ANALYSIS: Real-World Language**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Technical jargon in visible buttons ("Execute Query", "POST Data")
- Unclear icons without labels (abstract symbols users won't recognize)
- Industry-specific terms without explanation visible to users
- Ambiguous button labels ("Submit", "OK" without context)

✅ WHAT TO LOOK FOR:
- Are button labels clear and action-oriented?
- Do icons use universally understood symbols?
- Is terminology user-friendly?

IGNORE: Code comments, variable names
REPORT: Only confusing VISIBLE text and iconography`,

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

  "consistency": `**VISUAL ANALYSIS: Consistency & Standards**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Multiple button styles for similar actions (different colors, sizes)
- Navigation menu changes position across pages
- Inconsistent spacing and alignment
- Different icons for the same action
- Mixed design patterns (modern + outdated elements)

✅ WHAT TO LOOK FOR:
- Do similar elements look similar?
- Is visual hierarchy consistent?
- Do colors mean the same thing throughout?

IGNORE: Code consistency, CSS structure
REPORT: Only VISIBLE inconsistencies users experience`,

  "error_prevention": `**VISUAL ANALYSIS: Error Prevention**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Destructive actions (delete, clear) with no confirmation dialog
- No visual indication of required fields
- Date inputs without format examples shown
- Submit buttons active when form is incomplete
- No constraints visible on inputs (password requirements hidden)

✅ WHAT TO LOOK FOR:
- Are there confirmation dialogs before dangerous actions?
- Do forms show constraints and requirements?
- Are required fields marked visually?

IGNORE: HTML5 validation attributes
REPORT: Only missing VISIBLE prevention mechanisms`,

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

  "minimalist": `**VISUAL ANALYSIS: Aesthetic & Minimalist Design**

Look at the SCREENSHOT and identify:
❌ BAD EXAMPLES TO FLAG:
- Cluttered layouts with no whitespace
- Competing visual elements (multiple CTAs fighting for attention)
- Outdated design (Web 1.0 gradients, bevels, heavy shadows)
- Too much text without visual breathing room
- Distracting animations or visual noise
- Poor visual hierarchy (everything looks equally important)

✅ WHAT TO LOOK FOR:
- Is the design clean and modern?
- Is there sufficient whitespace?
- Is visual hierarchy clear?
- Is the color scheme tasteful?

IGNORE: File size, code bloat
REPORT: VISIBLE clutter and dated aesthetics`,

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
  apiKey: string
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
      "description": "What's done well",
      "example": "Specific example from the page"
    }
  ]
}

**CRITICAL RULES:**
1. Base analysis 95% on SCREENSHOT, 5% on text content
2. DO NOT report: meta tags, HTML attributes, ARIA labels, viewport, alt text, semantic HTML
3. DO report: outdated visual design, poor visual hierarchy, cluttered layouts, unclear UI elements
4. Every violation needs ALL fields above or it will be rejected
5. Title must be specific (>6 words), not generic
6. Research backing must cite specific UX research
7. User impact must quantify the problem

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
