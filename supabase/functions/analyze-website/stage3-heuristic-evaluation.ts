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
  "visibility": `Analyze for Visibility of System Status: Do users know what's happening? Check for loading states, hover effects, progress indicators, and current page highlights. Focus on user-perceivable feedback, NOT technical meta tags.`,
  
  "match_real_world": `Analyze for Real-World Match: Does language match user expectations? Check for jargon vs plain language, icon meanings, familiar patterns. Focus on communication, NOT code quality.`,
  
  "user_control": `Analyze for User Control: Can users undo, cancel, or exit? Check for close buttons, back options, undo features. Focus on escape routes, NOT missing functionality.`,
  
  "consistency": `Analyze for Consistency: Do similar elements look/behave the same? Check button styles, navigation placement, terminology. Focus on visual patterns, NOT code structure.`,
  
  "error_prevention": `Analyze for Error Prevention: Does design prevent mistakes? Check for confirmations on destructive actions, input validation, format hints. Focus on preventing user errors, NOT technical errors.`,
  
  "recognition": `Analyze for Recognition vs Recall: Is information visible vs memorized? Check for persistent labels, autocomplete, format examples. Focus on reducing memory load, NOT SEO metadata.`,
  
  "flexibility": `Analyze for Flexibility: Can expert users work faster? Check for keyboard shortcuts, bulk actions, customization, filters. Focus on acceleration features, NOT responsive design.`,
  
  "minimalist": `Analyze for Minimalist Design: Is there visual clutter? Check number of CTAs, information density, distractions. Focus on cognitive load, NOT file size.`,
  
  "error_recovery": `Analyze for Error Recovery: Are error messages helpful? Check for specific guidance, recovery options, visibility. Focus on user-facing errors, NOT console errors.`,
  
  "help_documentation": `Analyze for Help: Is help easy to find and contextual? Check for tooltips, examples, onboarding. Focus on user-accessible help, NOT developer docs.`
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { 
                text: `You are a UX expert analyzing websites for Nielsen Norman Group heuristics.

${prompt}

CRITICAL: Report ONLY user-perceivable UX issues, NOT technical/code problems.

Evidence:
${contextData}

Return JSON: {"violations": [{"severity": "high|medium|low", "title": "...", "description": "...", "location": "...", "recommendation": "...", "pageElement": "...", "researchBacking": "...", "userImpact": "..."}], "strengths": [{"description": "...", "example": "..."}]}`
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
