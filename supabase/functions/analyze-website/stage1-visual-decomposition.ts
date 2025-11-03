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

  const prompt = `You are a UX expert analyzing a website screenshot for VISUAL usability issues.

**TASK: Identify VISUAL UX problems and design issues**

Focus on what USERS SEE and EXPERIENCE:
1. **Outdated Design Patterns**: Web 1.0 aesthetics (heavy gradients, bevels, outdated colors)
2. **Visual Hierarchy Issues**: Everything same size/weight, no clear focus points
3. **Color & Contrast**: Low contrast text, poor readability, clashing colors
4. **Layout & Spacing**: Cluttered design, insufficient whitespace, elements too close
5. **Consistency**: Different button styles, inconsistent navigation patterns
6. **Visual Feedback**: Missing hover states, unclear clickable areas, no visual indicators
7. **Information Architecture**: Too much competing information, unclear grouping
8. **Typography**: Poor font choices, readability issues, inconsistent sizing

Also extract key UI elements for reference:
- Navigation menus and their visual treatment
- Buttons and their states (primary, secondary, disabled appearances)
- Forms and input fields
- Call-to-action elements
- Visual hierarchy patterns

**COLOR CONTRAST ANALYSIS:**
- Identify text with poor contrast (<4.5:1)
- Flag dated color schemes (saturated web-safe colors, heavy gradients)

Return comprehensive JSON focusing on VISUAL UX ISSUES, not technical code problems.`;

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
