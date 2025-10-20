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
  "visibility": `# HEURISTIC #1: Visibility of System Status

**CRITICAL: This is about USER-PERCEIVABLE feedback, NOT technical implementation.**

## WHAT THIS HEURISTIC IS:
✅ Do users know what the system is doing right now?
✅ Can users see loading/progress/status changes?
✅ Do interactive elements show state (hover, active, disabled)?

## WHAT THIS IS NOT:
❌ Technical HTML/meta tag issues (viewport, charset, etc.)
❌ Code structure or implementation details
❌ Performance metrics or load times
❌ SEO or accessibility attributes

## VALID VIOLATIONS (User Experience):
- Forms submit with no feedback → user doesn't know if it worked
- Buttons have no hover state → user can't tell if they're clickable
- Long operations with no progress bar → user doesn't know to wait
- No indication of current page in navigation → user is lost

## RESEARCH EVIDENCE REQUIRED:
- NN/g: Users need feedback within 0.1s (instant), 1s (flow), 10s (attention limit)
- Baymard: 67% abandon without progress indicators

ONLY report violations affecting REAL USERS' ability to understand system state.`,

  "match_real_world": `# HEURISTIC #2: Match Between System and Real World

**CRITICAL: This is about LANGUAGE and METAPHORS, NOT code quality.**

## WHAT THIS HEURISTIC IS:
✅ Do icons/labels match user expectations? (trash = delete, magnifying glass = search)
✅ Is language user-friendly vs technical jargon?
✅ Do visual metaphors make sense? (folder icons for folders)

## WHAT THIS IS NOT:
❌ HTML semantics or tag usage
❌ Code naming conventions
❌ Technical accuracy of implementation
❌ SEO or metadata issues

## VALID VIOLATIONS (User Experience):
- "Terminate session" instead of "Log out" → confusing jargon
- Unfamiliar icons with no labels → users don't recognize meaning
- Shopping cart labeled "Purchase container" → doesn't match mental model

## RESEARCH EVIDENCE:
- Jakob's Law: Users expect your site to work like others
- NN/g: Unfamiliar patterns increase cognitive load 20-40%

ONLY report language/visual mismatches affecting real user comprehension.`,

  "user_control": `# HEURISTIC #3: User Control and Freedom

**CRITICAL: This is about ESCAPE ROUTES and UNDO, NOT functionality.**

## WHAT THIS HEURISTIC IS:
✅ Can users cancel, go back, or close dialogs easily?
✅ Is there undo for mistakes?
✅ Can users exit workflows midway?

## WHAT THIS IS NOT:
❌ Missing features or functionality
❌ Technical implementation of controls
❌ Browser back button behavior
❌ Code architecture

## VALID VIOLATIONS (User Experience):
- Modal with no close button → user is trapped
- Destructive action with no confirm/undo → user can't recover from mistakes
- Multi-step form with no back button → user can't fix earlier errors

## RESEARCH EVIDENCE:
- NN/g: 20% of errors are accidental; need emergency exits
- Baymard: Forms without clear cancel have 15% higher abandonment

ONLY report violations where users feel trapped or can't undo actions.`,

  "consistency": `# HEURISTIC #4: Consistency and Standards

**CRITICAL: This is about VISUAL and BEHAVIORAL consistency, NOT code.**

## WHAT THIS HEURISTIC IS:
✅ Do similar elements look/behave the same across pages?
✅ Same action = same label everywhere?
✅ Consistent button styling, colors, spacing?

## WHAT THIS IS NOT:
❌ Code consistency or architecture
❌ HTML validation or standards compliance
❌ Technical naming conventions
❌ Framework or library usage

## VALID VIOLATIONS (User Experience):
- Primary buttons are blue on page 1, red on page 2 → visual inconsistency
- "Submit" on one form, "Send" on another → terminology inconsistency
- Navigation in different positions across pages → layout inconsistency

## RESEARCH EVIDENCE:
- NN/g: Inconsistency increases cognitive load 30-50%
- Fitts's Law: Consistent placement reduces interaction time

ONLY report visual/behavioral inconsistencies visible to users.`,

  "error_prevention": `# HEURISTIC #5: Error Prevention

**CRITICAL: This is about PREVENTING user mistakes, NOT technical errors.**

## WHAT THIS HEURISTIC IS:
✅ Does the design help users avoid errors before they happen?
✅ Are there confirmations for dangerous actions?
✅ Does inline validation prevent bad input?

## WHAT THIS IS NOT:
❌ Technical error handling in code
❌ Browser compatibility issues
❌ Missing HTML attributes (viewport, lang, etc.)
❌ Code-level validations

## VALID VIOLATIONS (User Experience):
- Delete button with no confirmation → user might accidentally delete
- Password field with no strength indicator → user creates weak password
- Date input as free text instead of picker → user enters invalid format

## RESEARCH EVIDENCE:
- Baymard: Forms without inline validation have 18% higher abandonment
- NN/g: Prevention is 10x better than good error messages

ONLY report design patterns that let users make preventable mistakes.`,

  "recognition": `# HEURISTIC #6: Recognition Rather Than Recall

**CRITICAL: This is about MEMORY BURDEN, NOT information architecture.**

## WHAT THIS HEURISTIC IS:
✅ Are options visible vs requiring users to remember them?
✅ Do forms show format examples?
✅ Is navigation always visible vs hidden?

## WHAT THIS IS NOT:
❌ SEO meta descriptions
❌ Alt text for images (that's accessibility)
❌ Technical documentation
❌ Code comments

## VALID VIOLATIONS (User Experience):
- Dropdown hides 50 categories → user must remember which category
- No autocomplete in search → user must recall exact terms
- Placeholder-only labels that disappear → user forgets what field is for

## RESEARCH EVIDENCE:
- Miller's Law: Working memory limited to 7±2 items
- NN/g: Recognition is 35% faster than recall

ONLY report violations forcing users to remember across interactions.`,

  "flexibility": `# HEURISTIC #7: Flexibility and Efficiency of Use

**CRITICAL: This is about EXPERT USER acceleration, NOT responsive design.**

## WHAT THIS HEURISTIC IS:
✅ Can power users work faster? (keyboard shortcuts, bulk actions)
✅ Are there quick access features for frequent tasks?
✅ Can users customize or filter to speed up workflows?

## WHAT THIS IS NOT:
❌ Mobile responsiveness or viewport settings
❌ Cross-browser compatibility
❌ Technical performance optimization
❌ HTML/CSS code quality

## VALID VIOLATIONS (User Experience):
- No keyboard shortcuts for common actions → power users must use mouse
- No bulk delete, must click one by one → inefficient for managing many items
- No search/filter in long lists → users must scroll/scan everything

## RESEARCH EVIDENCE:
- NN/g: Power users complete tasks 50% faster with shortcuts
- Fitts's Law: Shortcuts reduce interaction distance/time

**CRITICAL: Missing viewport meta tag is NOT a heuristic violation. It's a technical/responsive design issue.**

ONLY report violations where expert users are slowed by novice-only design.`,

  "minimalist": `# HEURISTIC #8: Aesthetic and Minimalist Design

**CRITICAL: This is about VISUAL CLUTTER, NOT code minimalism.**

## WHAT THIS HEURISTIC IS:
✅ Is the design cluttered or clean?
✅ Does irrelevant info compete with important content?
✅ Is there good visual hierarchy and white space?

## WHAT THIS IS NOT:
❌ File size or code optimization
❌ Number of HTML elements in DOM
❌ Technical minimalism in code
❌ SEO optimization

## VALID VIOLATIONS (User Experience):
- Homepage shows 50 competing CTAs → user can't focus
- Forms have unnecessary decorative elements → distracts from completion
- Every feature advertised on landing page → overwhelms new users

## RESEARCH EVIDENCE:
- Hick's Law: Decision time increases logarithmically with choices
- NN/g: Every extra element reduces comprehension by 10%

ONLY report visual clutter reducing user focus and comprehension.`,

  "error_recovery": `# HEURISTIC #9: Help Users Recognize, Diagnose, and Recover from Errors

**CRITICAL: This is about USER-FACING error messages, NOT technical errors.**

## WHAT THIS HEURISTIC IS:
✅ Are error messages clear and helpful?
✅ Do they explain what went wrong and how to fix it?
✅ Are errors visually prominent?

## WHAT THIS IS NOT:
❌ Console errors or developer errors
❌ Technical error codes
❌ Server-side error handling
❌ Missing HTML validation attributes

## VALID VIOLATIONS (User Experience):
- Form shows "Error 422" instead of "Please enter a valid email" → unhelpful
- Generic "Something went wrong" with no guidance → user can't recover
- Error message not near problematic field → user can't identify issue

## RESEARCH EVIDENCE:
- NN/g: Specific error messages reduce resolution time by 60%
- Baymard: Generic errors cause 22% form abandonment

ONLY report violations where user-facing errors are vague or unhelpful.`,

  "help_documentation": `# HEURISTIC #10: Help and Documentation

**CRITICAL: This is about USER-ACCESSIBLE help, NOT developer docs.**

## WHAT THIS HEURISTIC IS:
✅ Is help available when users need it? (tooltips, FAQs)
✅ Is complex functionality explained?
✅ Are there contextual hints for confusing elements?

## WHAT THIS IS NOT:
❌ Code comments or developer documentation
❌ Technical API documentation
❌ Meta descriptions for SEO
❌ Alt text (that's accessibility)

## VALID VIOLATIONS (User Experience):
- Complex settings with no tooltips or help links → users confused
- No FAQ or help center link visible → users can't find answers
- Jargon-heavy UI with no explanations → users don't understand

## RESEARCH EVIDENCE:
- NN/g: Contextual help reduces support tickets by 40%
- Users prefer inline help over separate documentation

ONLY report violations where users need but can't find helpful guidance.`
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

  const prompt = HEURISTIC_SPECIFIC_PROMPTS[heuristicKey] || HEURISTIC_SPECIFIC_PROMPTS["visibility"];

  const contextData = `
**VISUAL EVIDENCE:**
${JSON.stringify(visualData, null, 2).substring(0, 3000)}

**STRUCTURAL FINDINGS:**
${JSON.stringify(structuralData, null, 2).substring(0, 2000)}

**PAGE CONTENT:**
${markdown.substring(0, 2000)}

**HTML SAMPLE:**
${html.substring(0, 1500)}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { 
                text: `You are a UX evaluation expert trained in Nielsen Norman Group heuristic evaluation methodology.

${prompt}

═══════════════════════════════════════
CRITICAL FILTERING RULES
═══════════════════════════════════════

🚫 DO NOT REPORT THESE AS HEURISTIC VIOLATIONS:
1. Missing HTML meta tags (viewport, charset, description, etc.)
2. Missing alt attributes on images (this is accessibility, not heuristics)
3. Code quality or technical implementation issues
4. SEO-related problems
5. Browser compatibility issues
6. Performance or load time issues
7. Missing HTML semantic tags
8. CSS or JavaScript issues

✅ ONLY REPORT THESE:
1. User-perceivable design patterns affecting experience
2. Interaction issues users actually encounter
3. Visual design problems causing confusion
4. Information architecture affecting task completion
5. Workflow issues preventing user goals

═══════════════════════════════════════
EVIDENCE PROVIDED
═══════════════════════════════════════

${contextData}

═══════════════════════════════════════
REQUIRED OUTPUT FORMAT
═══════════════════════════════════════

{
  "violations": [{
    "severity": "high|medium|low",
    "title": "User-facing issue in 6-10 words",
    "description": "WHY this violates THIS SPECIFIC heuristic with visible evidence from screenshot/content. Must reference actual user experience impact, not technical implementation.",
    "location": "Precise visual location users can see",
    "recommendation": "Design change (not code fix) to improve UX",
    "pageElement": "Visible UI element description",
    "boundingBox": {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100},
    "researchBacking": "Specific NN/g or Baymard study with data",
    "userImpact": "Quantified user behavior impact (e.g., '15% abandonment', '40% slower')"
  }],
  "strengths": [{
    "description": "User-facing design pattern done well",
    "example": "Specific visible example from page"
  }]
}

═══════════════════════════════════════
QUALITY CHECKLIST
═══════════════════════════════════════

Before reporting each violation, verify:
- [ ] Is this about USER EXPERIENCE, not code?
- [ ] Can actual users SEE/FEEL this problem?
- [ ] Does it specifically violate THIS heuristic (not another)?
- [ ] Is there VISIBLE EVIDENCE in the screenshot/content?
- [ ] Is the research backing specific and relevant?

REJECT violations about:
❌ HTML structure, meta tags, attributes
❌ Technical performance or optimization
❌ SEO or metadata
❌ Accessibility attributes (use separate accessibility scan)

ONLY ACCEPT violations about:
✅ What users see and interact with
✅ Design patterns affecting user tasks
✅ Visual/interaction issues causing confusion` 
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: screenshot.split(',')[1]
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,  // Lower temperature for more focused, accurate results
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      console.error(`Heuristic ${heuristicKey} evaluation failed:`, response.status);
      return { violations: [], strengths: [] };
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    
    // Add heuristic name to all violations
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
