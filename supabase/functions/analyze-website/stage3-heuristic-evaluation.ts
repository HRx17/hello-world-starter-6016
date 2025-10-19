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
  "visibility": `Evaluate ONLY "Visibility of System Status" (#1)

FOCUS AREAS:
- Loading states and progress indicators
- Form submission feedback
- Hover/focus states on interactive elements
- Current page indicators in navigation
- System status messages (success, error, warning)
- Real-time updates and notifications

EVIDENCE TO EXAMINE:
- Visual elements showing state changes
- Presence/absence of loading spinners
- Button states (default, hover, active, disabled)
- Form validation feedback timing

RESEARCH BACKING:
- NN/g: Users need feedback within 0.1s for instant, 1s for flow, 10s for attention limit
- Baymard: 67% of users abandon processes without clear progress indicators

Return ONLY violations where users cannot perceive system status.`,

  "match_real_world": `Evaluate ONLY "Match Between System and Real World" (#2)

FOCUS AREAS:
- Icon meanings and familiarity (shopping cart, trash, search, etc.)
- Language and terminology (technical jargon vs plain language)
- Metaphors and mental models
- Visual representations matching real-world objects

EVIDENCE TO EXAMINE:
- Icon choices (standard vs custom)
- Button labels (technical vs user-friendly)
- Navigation terminology
- Visual metaphors used

RESEARCH BACKING:
- NN/g: Users rely on familiar patterns; deviations increase cognitive load by 20-40%
- Jakob's Law: Users prefer your site to work like others they know

Return ONLY violations where terminology/visuals don't match user expectations.`,

  "user_control": `Evaluate ONLY "User Control and Freedom" (#3)

FOCUS AREAS:
- Cancel buttons in forms/dialogs
- Undo/Redo functionality
- Modal exit methods (X button, ESC key, backdrop click)
- Back button visibility
- Ability to recover from errors

EVIDENCE TO EXAMINE:
- Modal/dialog closing mechanisms
- Form abandonment options
- Destructive action confirmations
- Navigation escape routes

RESEARCH BACKING:
- NN/g: 20% of errors are caused by accidental actions; users need emergency exits
- Baymard: Forms without clear cancel/back options have 15% higher abandonment

Return ONLY violations where users feel trapped or can't undo mistakes.`,

  "consistency": `Evaluate ONLY "Consistency and Standards" (#4)

FOCUS AREAS:
- Visual consistency (buttons, colors, typography across pages)
- Terminology consistency (same action = same label)
- Layout patterns (similar elements in similar locations)
- Icon usage (same icon = same meaning)

EVIDENCE TO EXAMINE:
- Button styling variations
- Label terminology for similar actions
- Spacing and alignment patterns
- Icon representations

RESEARCH BACKING:
- NN/g: Inconsistency increases cognitive load and learning time by 30-50%
- Fitts's Law: Consistent placement reduces interaction time

Return ONLY violations where similar elements behave differently or look different.`,

  "error_prevention": `Evaluate ONLY "Error Prevention" (#5)

FOCUS AREAS:
- Inline form validation (real-time feedback)
- Confirmation dialogs for destructive actions
- Input constraints (date pickers, dropdowns vs free text)
- Auto-save and recovery features
- Disabled states preventing invalid actions

EVIDENCE TO EXAMINE:
- Form validation triggers (on submit vs on blur)
- Delete/destructive action confirmations
- Input field types and constraints
- Error prevention mechanisms

RESEARCH BACKING:
- Baymard: Forms without inline validation have 18% higher abandonment
- NN/g: Prevention is 10x better than good error messages

Return ONLY violations where users can make preventable errors.`,

  "recognition": `Evaluate ONLY "Recognition Rather Than Recall" (#6)

FOCUS AREAS:
- Visible options vs hidden menus
- Autocomplete and search suggestions
- Recently viewed items
- Placeholder examples showing expected format
- Visible labels (not just placeholders)

EVIDENCE TO EXAMINE:
- Dropdown menus hiding options
- Search with/without autocomplete
- Form field format examples
- Persistent labels vs disappearing placeholders

RESEARCH BACKING:
- Miller's Law: Working memory limited to 7±2 items; visible > recalled
- NN/g: Recognition tasks are 35% faster than recall

Return ONLY violations where users must remember information across interactions.`,

  "flexibility": `Evaluate ONLY "Flexibility and Efficiency of Use" (#7)

FOCUS AREAS:
- Keyboard shortcuts
- Bulk actions for power users
- Search and filter options
- Customization capabilities
- Quick access to frequent actions

EVIDENCE TO EXAMINE:
- Keyboard navigation support
- Batch operation availability
- Search functionality
- User customization options

RESEARCH BACKING:
- NN/g: Power users complete tasks 50% faster with shortcuts
- Fitts's Law: Shortcuts reduce interaction distance/time

Return ONLY violations where expert users are slowed by novice-oriented design.`,

  "minimalist": `Evaluate ONLY "Aesthetic and Minimalist Design" (#8)

FOCUS AREAS:
- Information density and clutter
- Visual hierarchy and focus
- Removal of unnecessary elements
- Progressive disclosure of complexity
- White space usage

EVIDENCE TO EXAMINE:
- Content-to-chrome ratio
- Number of UI elements competing for attention
- Visual noise vs signal
- Information architecture

RESEARCH BACKING:
- Hick's Law: Decision time increases logarithmically with choices
- NN/g: Every extra element reduces comprehension by 10%

Return ONLY violations where irrelevant content competes with important information.`,

  "error_recovery": `Evaluate ONLY "Help Users Recognize, Diagnose, and Recover from Errors" (#9)

FOCUS AREAS:
- Error message clarity and specificity
- Visual prominence of errors
- Constructive guidance for fixes
- Error location highlighting
- Solution suggestions

EVIDENCE TO EXAMINE:
- Error message text (generic vs specific)
- Error styling and visibility
- Recovery instructions
- Field-level error indicators

RESEARCH BACKING:
- NN/g: Specific error messages reduce resolution time by 60%
- Baymard: Generic errors cause 22% form abandonment

Return ONLY violations where error messages are vague or unhelpful.`,

  "help_documentation": `Evaluate ONLY "Help and Documentation" (#10)

FOCUS AREAS:
- Contextual help (tooltips, info icons)
- Help center accessibility
- Search functionality in docs
- Examples and tutorials
- FAQ availability

EVIDENCE TO EXAMINE:
- Tooltip presence on complex elements
- Help link visibility
- Documentation searchability
- Contextual guidance

RESEARCH BACKING:
- NN/g: Contextual help reduces support tickets by 40%
- Users prefer inline help over separate documentation

Return ONLY violations where help is missing or hard to find when needed.`
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
                text: `${prompt}

${contextData}

**MANDATORY OUTPUT FORMAT:**
{
  "violations": [{
    "severity": "high|medium|low",
    "title": "Specific 6-10 word title citing exact element",
    "description": "2-3 sentences explaining WHY this violates the heuristic with evidence",
    "location": "Precise page location with landmarks",
    "recommendation": "Actionable fix with implementation details",
    "pageElement": "CSS selector or HTML description",
    "boundingBox": {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100},
    "researchBacking": "Cite NN/g or Baymard study supporting this finding",
    "userImpact": "Quantified impact on users (e.g., '15% task abandonment')"
  }],
  "strengths": [{
    "description": "What the site does well for this heuristic",
    "example": "Specific example from the page"
  }]
}

Be ruthlessly specific. No generic observations.` 
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
            temperature: 0.2,
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
