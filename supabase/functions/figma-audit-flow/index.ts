import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Persona {
  name: string;
  description?: string;
  painPoints?: string[];
  goals?: string[];
}

interface FrameData {
  nodeId: string;
  name: string;
  imageData: string;
}

interface AuditIssue {
  frameId: string;
  frameName: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  heuristic: string;
}

// Nielsen's 10 Usability Heuristics
const NIELSENS_HEURISTICS = `
NIELSEN'S 10 USABILITY HEURISTICS - Evaluate each screen against ALL of these:

1. VISIBILITY OF SYSTEM STATUS
   - Does the system keep users informed about what's going on?
   - Are there appropriate feedback mechanisms (loading states, progress indicators, confirmations)?
   - Can users tell what state they're in (logged in, what screen, what mode)?

2. MATCH BETWEEN SYSTEM AND REAL WORLD
   - Does the interface use language familiar to the user (not technical jargon)?
   - Are icons and symbols intuitive and match real-world conventions?
   - Does the information flow in a natural, logical order?

3. USER CONTROL AND FREEDOM
   - Can users easily undo/redo actions?
   - Are there clear "emergency exits" (cancel, back, close)?
   - Can users freely navigate without getting trapped?

4. CONSISTENCY AND STANDARDS
   - Are similar elements styled consistently throughout?
   - Does the interface follow platform conventions?
   - Are the same actions named the same way across the app?

5. ERROR PREVENTION
   - Does the design prevent errors before they occur?
   - Are dangerous actions confirmed before execution?
   - Are constraints and guardrails in place for user inputs?

6. RECOGNITION RATHER THAN RECALL
   - Are options visible rather than hidden?
   - Is context provided so users don't have to remember information?
   - Are instructions visible when needed?

7. FLEXIBILITY AND EFFICIENCY OF USE
   - Are there shortcuts for experienced users?
   - Can frequent actions be performed quickly?
   - Can the interface be customized/personalized?

8. AESTHETIC AND MINIMALIST DESIGN
   - Is the interface free of irrelevant information?
   - Is visual hierarchy clear?
   - Does every element serve a purpose?

9. HELP USERS RECOGNIZE, DIAGNOSE, AND RECOVER FROM ERRORS
   - Are error messages clear and in plain language?
   - Do they precisely indicate the problem?
   - Do they suggest a solution?

10. HELP AND DOCUMENTATION
    - Is help available when needed?
    - Is documentation searchable and task-focused?
    - Are instructions concise and clear?
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frames, persona, productContext, auditMode } = await req.json() as { 
      frames: FrameData[]; 
      persona: Persona;
      productContext: string;
      auditMode: 'current' | 'flow';
    };

    if (!frames || frames.length === 0) {
      throw new Error("At least one frame is required");
    }

    if (!persona || !persona.name) {
      throw new Error("Persona is required");
    }

    if (!productContext) {
      throw new Error("Product context is required");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Build persona context
    const frustrations = persona.painPoints?.join(", ") || "general usability concerns";
    const goals = persona.goals?.join(", ") || "completing tasks efficiently";
    const description = persona.description || "a typical user";
    const personaName = persona.name;

    console.log(`Running smart audit for persona: ${personaName}, frames: ${frames.length}, mode: ${auditMode}, product: ${productContext.substring(0, 50)}...`);

    let systemPrompt: string;
    let contentPayload: any[];

    // Core contextual understanding instructions
    const contextualUnderstandingPrompt = `
PRODUCT CONTEXT (CRITICAL - Use this to understand ALL UI elements):
"${productContext}"

CONTEXTUAL UNDERSTANDING RULES:
You must interpret UI elements IN CONTEXT of what this product is. Examples of contextual interpretation:

- If this is a "shift management app" and you see "10/20 hr", understand this means "10 hours worked out of 20 hours scheduled for the week"
- If this is an "e-commerce app" and you see "$0.00", understand if this is a cart total, savings, or an error
- If this is a "fitness app" and you see "3/7", understand this likely means "3 out of 7 days completed"
- If this is a "task management app" and you see "12%", understand this likely means completion progress

DO NOT flag things as issues if they make sense in context. Instead:
1. First understand what the product does
2. Then interpret each UI element through that lens
3. Only flag issues that would genuinely confuse the TARGET PERSONA

${NIELSENS_HEURISTICS}
`;

    if (auditMode === 'flow' && frames.length > 1) {
      // Multi-frame flow analysis
      const frameList = frames.map((f, i) => `Screen ${i + 1}: "${f.name}"`).join(", ");
      
      systemPrompt = `You are a UX Expert conducting a HEURISTIC EVALUATION walkthrough as the persona "${personaName}".

PERSONA PROFILE:
- Description: ${description}
- Goals: ${goals}
- Frustrations/Pain Points: ${frustrations}

${contextualUnderstandingPrompt}

FLOW ANALYSIS:
You are walking through a prototype flow with ${frames.length} screens: ${frameList}

For EACH screen in the flow, evaluate against Nielsen's 10 Heuristics while ROLE-PLAYING as this persona:

WHAT TO LOOK FOR:
1. Does each screen help the persona achieve their goals?
2. Are there friction points that would frustrate THIS specific persona given their pain points?
3. Is the flow logical for this persona's mental model of ${productContext}?
4. Are there consistency issues between screens?
5. Would this persona understand the information displayed based on context?

CONTEXTUAL INTERPRETATION EXAMPLES for "${productContext}":
- Numbers and metrics should be interpreted in product context (hours, money, progress, etc.)
- Status indicators should make sense for the domain
- Navigation should follow expected patterns for this type of app

Respond with a JSON object:
{
  "issues": [
    {
      "frameId": "<nodeId of the problematic frame>",
      "frameName": "<name of the frame>",
      "title": "<short issue title referencing the heuristic>",
      "description": "<detailed explanation: what the issue is, why it matters for this persona, and the contextual interpretation>",
      "severity": "<high|medium|low>",
      "category": "<accessibility|usability|flow|persona-specific>",
      "heuristic": "<which of Nielsen's 10 heuristics this violates>"
    }
  ],
  "journeyNarrative": "<A first-person narrative (4-6 sentences) of ${personaName} describing their experience walking through this ${productContext}. Express their specific frustrations based on their pain points: ${frustrations}. Show understanding of the product context.>"
}

Find 5-10 issues across all screens. Prioritize issues that:
1. Violate Nielsen's heuristics in ways that impact THIS persona
2. Create friction given the persona's specific pain points
3. Would confuse users about the contextual meaning of displayed information`;

      contentPayload = [
        { type: "text", text: systemPrompt },
        ...frames.map((frame, i) => ({
          type: "image_url",
          image_url: { url: frame.imageData }
        }))
      ];
    } else {
      // Single frame analysis
      systemPrompt = `You are a UX Expert conducting a HEURISTIC EVALUATION of a single screen from a ${productContext}.

PERSONA PROFILE (Evaluate from their perspective):
- Name: ${personaName}
- Description: ${description}
- Goals: ${goals}
- Frustrations/Pain Points: ${frustrations}

${contextualUnderstandingPrompt}

SINGLE SCREEN ANALYSIS:
Frame: "${frames[0].name}"

Evaluate this screen against ALL 10 of Nielsen's Usability Heuristics while considering:
1. The product context (${productContext})
2. The persona's specific goals and frustrations
3. How UI elements should be interpreted in context

ANALYSIS APPROACH:
1. First, identify what this screen's PURPOSE is within the ${productContext}
2. Interpret all numbers, labels, and indicators in product context
3. Evaluate each heuristic from the persona's perspective
4. Only flag genuine issues, not contextually appropriate design choices

Respond with a JSON object:
{
  "issues": [
    {
      "frameId": "${frames[0].nodeId}",
      "frameName": "${frames[0].name}",
      "title": "<Short issue title with heuristic name>",
      "description": "<Detailed explanation: the issue, why it violates the heuristic, and how it affects ${personaName} specifically. Include contextual interpretation.>",
      "severity": "<high|medium|low>",
      "category": "<accessibility|usability|persona-specific>",
      "heuristic": "<which of Nielsen's 10 heuristics this violates>"
    }
  ],
  "journeyNarrative": "<A first-person sentence from ${personaName} describing their reaction to this screen in the context of ${productContext}, referencing their specific frustrations: ${frustrations}>"
}

Identify 3-6 issues. Prioritize issues that:
1. Violate Nielsen's heuristics
2. Would specifically frustrate ${personaName} given their pain points
3. Create confusion about contextual meaning`;

      contentPayload = [
        { type: "text", text: systemPrompt },
        { type: "image_url", image_url: { url: frames[0].imageData } }
      ];
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: contentPayload,
            },
          ],
          max_tokens: 6000,
          temperature: 0.4,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI Error:", errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Rate limit exceeded. Please try again in a moment.",
            issues: []
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Payment required. Please check your OpenAI billing.",
            issues: []
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response received");

    const aiText = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse AI response:", aiText);
      return new Response(
        JSON.stringify({ 
          success: true, 
          issues: [{
            frameId: frames[0].nodeId,
            frameName: frames[0].name,
            title: "Analysis Complete",
            description: "AI analysis completed but returned unexpected format. Manual review recommended.",
            severity: "low",
            category: "system",
            heuristic: "N/A"
          }],
          journeyNarrative: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const issues: AuditIssue[] = (result.issues || []).slice(0, 12).map((issue: any) => ({
      frameId: issue.frameId || frames[0].nodeId,
      frameName: issue.frameName || frames[0].name,
      title: issue.title || "Unnamed Issue",
      description: issue.description || "No description provided",
      severity: ["high", "medium", "low"].includes(issue.severity) ? issue.severity : "medium",
      category: issue.category || "usability",
      heuristic: issue.heuristic || "General"
    }));

    console.log(`Smart audit complete: ${issues.length} issues found`);

    return new Response(
      JSON.stringify({
        success: true,
        issues,
        journeyNarrative: result.journeyNarrative || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in figma-audit-flow:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        issues: []
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
