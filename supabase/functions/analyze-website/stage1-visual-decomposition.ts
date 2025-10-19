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

  const prompt = `You are a computer vision expert analyzing a website screenshot for UX evaluation.

**TASK: Extract EVERY visible UI element with precise details**

For each element, identify:
1. Element type (button, link, input, heading, image, icon, etc.)
2. Exact text content (if any)
3. Bounding box coordinates (x, y, width, height as % of screenshot)
4. Visual properties (colors, font size, styling)
5. Interaction indicators (hover effects visible, focus rings, clickable appearance)

**SPECIAL ATTENTION TO:**
- Navigation menus (including dropdowns, mega menus)
- Form elements (inputs, labels, validation messages, placeholders)
- Buttons (primary, secondary, disabled states)
- Error messages and alerts
- Loading indicators
- Breadcrumbs and pagination
- Modals and overlays
- Icons and their meanings

**COLOR CONTRAST ANALYSIS:**
For text elements, calculate approximate contrast ratios:
- Text vs background
- Flag potential WCAG violations (< 4.5:1 for normal text, < 3:1 for large text)

**VISUAL HIERARCHY:**
Categorize elements into sections:
- Header/top navigation
- Main content area
- Sidebars
- Footer
- Floating/modal elements

Return comprehensive JSON mapping of ALL visible UI elements.`;

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
              { text: prompt },
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
      const errorText = await response.text();
      console.error('Visual decomposition failed:', errorText);
      throw new Error(`Visual decomposition failed: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    
    console.log('Stage 1 complete: Extracted', result.elements?.length || 0, 'UI elements');
    return result;
  } catch (error) {
    console.error('Error in visual decomposition:', error);
    // Return minimal structure on error
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
      contrastIssues: []
    };
  }
}
