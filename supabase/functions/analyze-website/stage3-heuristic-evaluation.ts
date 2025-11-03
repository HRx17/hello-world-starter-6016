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
  "visibility": `Analyze ONLY visual UI elements for Visibility of System Status:
- Look at the SCREENSHOT: Are loading states, progress bars, status indicators visible?
- Check hover states, active states, selected states
- Verify current page/section is highlighted in navigation
IGNORE: Meta tags, HTML structure, code-level checks. Only report what USERS SEE.`,
  
  "match_real_world": `Analyze ONLY visual language and iconography:
- Look at button labels, headings, menu items in the SCREENSHOT
- Check if icons are intuitive and commonly understood
- Verify terminology matches user mental models
IGNORE: Code quality, technical jargon in HTML. Only report visible text issues.`,
  
  "user_control": `Analyze ONLY visible control mechanisms:
- Look for close (X) buttons, cancel buttons, back buttons in the SCREENSHOT
- Check for undo/redo options in toolbars
- Verify users have clear exit paths from modals/processes
IGNORE: Missing features, code implementation. Only report missing visible controls.`,
  
  "consistency": `Analyze ONLY visual consistency patterns:
- Compare button styles, colors, sizes across the SCREENSHOT
- Check navigation placement and design consistency
- Verify similar actions use similar visual patterns
IGNORE: Code consistency, CSS structure. Only report visual inconsistencies users see.`,
  
  "error_prevention": `Analyze ONLY visible prevention mechanisms:
- Look for confirmation dialogs before destructive actions
- Check for input hints, placeholders, format examples shown to users
- Verify required fields are marked visually
IGNORE: Missing HTML attributes, validation code. Only report missing visible safeguards.`,
  
  "recognition": `Analyze ONLY visibility of information:
- Check if labels persist next to inputs (not just placeholders)
- Look for visible format examples, autocomplete suggestions
- Verify icons have visible text labels
IGNORE: Accessibility attributes, ARIA labels. Only report what users visually see.`,
  
  "flexibility": `Analyze ONLY visible efficiency features:
- Look for keyboard shortcut indicators shown in UI
- Check for bulk action buttons, advanced filters visible to users
- Verify search bars, quick actions are prominent
IGNORE: Responsive design code, mobile viewport tags. Only report missing visible shortcuts.`,
  
  "minimalist": `Analyze ONLY visual clutter and information density:
- Count competing calls-to-action in the SCREENSHOT
- Check for excessive text, overlapping elements, visual noise
- Verify white space usage and content breathing room
IGNORE: Code bloat, file sizes. Only report visual clutter users experience.`,
  
  "error_recovery": `Analyze ONLY visible error handling:
- Look for error messages that appear on screen
- Check if errors explain what went wrong and how to fix it
- Verify error messages are prominent and noticeable
IGNORE: Console errors, HTTP status codes. Only report user-facing error UX issues.`,
  
  "help_documentation": `Analyze ONLY visible help elements:
- Look for help icons, tooltips, info buttons in the SCREENSHOT
- Check for visible onboarding, tutorial elements
- Verify contextual help is accessible and noticeable
IGNORE: README files, developer documentation. Only report missing visible help for users.`
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
                text: `You are a UX expert analyzing websites through VISUAL INSPECTION for Nielsen Norman Group heuristics.

${prompt}

CRITICAL RULES:
1. ONLY analyze what users SEE in the screenshot - ignore code-level issues
2. DO NOT report: missing meta tags, viewport configs, HTML attributes, ARIA labels, alt text
3. DO report: visible UI problems, layout issues, unclear labels, missing visible buttons
4. Base your analysis 90% on the SCREENSHOT, 10% on text content
5. If something works visually but has code issues - DO NOT REPORT IT

Evidence for context:
${contextData}

Return JSON with ONLY visual UX issues: {"violations": [{"severity": "high|medium|low", "title": "...", "description": "...", "location": "...", "recommendation": "...", "pageElement": "...", "researchBacking": "...", "userImpact": "..."}], "strengths": [{"description": "...", "example": "..."}]}`
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
            temperature: 0.1,
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
