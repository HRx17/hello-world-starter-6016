// Stage 1: Deep Visual Decomposition using Gemini Vision
// Extracts every UI element with precise coordinates and visual properties

export interface VisualElement {
  type: string;
  text?: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  visualProperties: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    contrast?: number;
  };
  interactionState?: {
    hasHoverState: boolean;
    hasFocusState: boolean;
    isClickable: boolean;
  };
}

export interface VisualDecomposition {
  elements: VisualElement[];
  visualHierarchy: {
    header: VisualElement[];
    navigation: VisualElement[];
    mainContent: VisualElement[];
    footer: VisualElement[];
    modals: VisualElement[];
  };
  colorPalette: {
    primary: string[];
    secondary: string[];
    text: string[];
    background: string[];
  };
  contrastIssues: Array<{
    element: string;
    foreground: string;
    background: string;
    ratio: number;
    wcagLevel: 'AAA' | 'AA' | 'fail';
  }>;
}

export async function performVisualDecomposition(
  screenshot: string,
  html: string,
  apiKey: string
): Promise<VisualDecomposition> {
  console.log('Stage 1: Starting deep visual decomposition...');
  
  // Validate and prepare screenshot data
  let screenshotData: string;
  if (screenshot.startsWith('data:image')) {
    // Extract base64 part from data URI
    const parts = screenshot.split(',');
    if (parts.length < 2) {
      console.error('Invalid data URI format - missing comma separator');
      throw new Error('Invalid screenshot data format');
    }
    screenshotData = parts[1];
  } else if (screenshot.startsWith('http')) {
    console.error('Screenshot is still a URL, should have been converted to base64');
    throw new Error('Screenshot must be base64 encoded, not a URL');
  } else {
    // Assume already base64 encoded
    screenshotData = screenshot;
  }
  
  if (!screenshotData || screenshotData.length < 100) {
    console.error('Screenshot data is empty or too small:', screenshotData?.length || 0, 'bytes');
    throw new Error('Invalid screenshot data - too small or empty');
  }
  
  console.log('Screenshot validated:', screenshotData.substring(0, 30) + '...', `(${screenshotData.length} chars)`);

  const prompt = `You are a senior UX researcher from Nielsen Norman Group. You're looking at this website screenshot with fresh eyes, like a first-time user would.

**YOUR TASK: Look at this page as a HUMAN USER would see it**

Imagine you just landed on this website. What jumps out at you? What feels wrong or dated?

## VISUAL & LAYOUT ANALYSIS (Most Important)

**1. FIRST IMPRESSIONS (What a user sees in 3 seconds):**
   - Does this look modern or dated? (2025 vs 2010 web design)
   - Is there a clear visual hierarchy? Where does your eye go first?
   - What's the most prominent element? Is it what SHOULD be most prominent?
   - Does anything look "off" - spacing, alignment, colors?

**2. SPATIAL RELATIONSHIPS & LAYOUT:**
   - Are elements too close together? (causing visual clutter)
   - Is there enough breathing room / whitespace?
   - Do related items look related? (proximity principle)
   - Are there awkward gaps or misalignments?
   - Does the layout look balanced or lopsided?

**3. COLOR & CONTRAST (Critical for Readability):**
   - Can you easily read ALL text against its background?
   - Are there any gray-on-gray or low-contrast combinations?
   - Do colors look harmonious or clashing?
   - Are dated color choices used? (Overly saturated blues, gradients with shine effects)
   - Is the color palette modern or reminiscent of early 2000s web?

**4. TYPOGRAPHY & READABILITY:**
   - Are fonts easy to read?
   - Is text size appropriate? (Not too small, especially for body text)
   - Is there too much variation in fonts/sizes? (inconsistency)
   - Are headings clearly distinguished from body text?

**5. VISUAL DESIGN PATTERNS (Dated vs Modern):**
   - DATED PATTERNS to flag: Heavy drop shadows, glossy buttons, heavy gradients, beveled edges, skeuomorphism, Web 2.0 shine effects
   - MODERN PATTERNS: Flat or subtle depth, generous whitespace, clean typography, subtle shadows, clear hierarchy

**6. INTERACTION AFFORDANCES:**
   - Can you tell what's clickable? (buttons should look like buttons)
   - Are clickable elements visually distinct?
   - Do elements that look the same have the same function?
   - Are interactive states visible? (hover, active, focus indicators)

**7. INFORMATION DENSITY:**
   - Is there too much competing for attention?
   - Are there clear visual sections?
   - Does any area feel overwhelming or cluttered?

## EXTRACT SPECIFIC UI ELEMENTS:
For reference, identify and locate:
- Navigation patterns and their position
- Primary and secondary buttons (note their visual treatment)
- Form inputs and their states
- Call-to-action elements and their prominence
- Any visual inconsistencies (same element looking different in different places)

## OUTPUT FORMAT:
Return detailed JSON with:
1. **elements**: Array of UI components with precise locations (bounding boxes as percentages)
2. **visualHierarchy**: Categorized elements (header, nav, main content, footer, modals)
3. **colorPalette**: Extracted colors (primary, secondary, text, background)
4. **contrastIssues**: Any text/background pairs with poor contrast (<4.5:1 ratio)

**CRITICAL: Focus on VISUAL issues a human would notice, not code/HTML problems.**`;

  // Retry logic for transient failures
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
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
              { text: prompt },
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
        console.error(`Visual decomposition attempt ${attempt} failed:`, errorText);
        lastError = new Error(`Visual decomposition failed: ${response.status} - ${errorText}`);
        if (attempt < 2) {
          console.log(`Retrying visual decomposition (attempt ${attempt + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Invalid response structure from Gemini:', JSON.stringify(data));
        lastError = new Error('Invalid response structure from Gemini');
        if (attempt < 2) continue;
        throw lastError;
      }

      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      
      console.log('Stage 1 complete: Extracted', result.elements?.length || 0, 'UI elements');
      console.log('Visual issues detected:', result.contrastIssues?.length || 0, 'contrast issues');
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        console.log(`Retrying after error (attempt ${attempt + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  console.error('Error in visual decomposition after all retries:', lastError);
  // Return minimal structure on error but log it prominently
  console.warn('⚠️ STAGE 1 FAILED - Visual analysis will be incomplete');
  return {
    elements: [],
    visualHierarchy: {
      header: [],
      navigation: [],
      mainContent: [],
      footer: [],
      modals: []
    },
    colorPalette: {
      primary: [],
      secondary: [],
      text: [],
      background: []
    },
    contrastIssues: [],
    _failed: true // Flag for downstream stages
  } as any;
}
