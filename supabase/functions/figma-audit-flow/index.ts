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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frames, persona, auditMode } = await req.json() as { 
      frames: FrameData[]; 
      persona: Persona;
      auditMode: 'current' | 'flow';
    };

    if (!frames || frames.length === 0) {
      throw new Error("At least one frame is required");
    }

    if (!persona || !persona.name) {
      throw new Error("Persona is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Lovable AI API key not configured");
    }

    // Build persona context
    const frustrations = persona.painPoints?.join(", ") || "general usability concerns";
    const goals = persona.goals?.join(", ") || "completing tasks efficiently";
    const description = persona.description || "a typical user";
    const personaName = persona.name;

    console.log(`Running flow audit for persona: ${personaName}, frames: ${frames.length}, mode: ${auditMode}`);

    let systemPrompt: string;
    let contentPayload: any[];

    if (auditMode === 'flow' && frames.length > 1) {
      // Multi-frame flow analysis - persona walks through the prototype
      const frameList = frames.map((f, i) => `Screen ${i + 1}: "${f.name}"`).join(", ");
      
      systemPrompt = `You are a UX Researcher performing a walkthrough as "${personaName}" - ${description}.

Your frustrations: ${frustrations}
Your goals: ${goals}

You are walking through a prototype flow with ${frames.length} screens: ${frameList}

For each screen in order, analyze it AS IF YOU ARE THIS PERSONA navigating through the app:
1. What would confuse or frustrate this persona on each screen?
2. What barriers prevent them from achieving their goals?
3. Are there usability issues (touch targets, contrast, navigation clarity)?
4. Is the flow logical for this persona's mental model?

IMPORTANT:
- Focus on visual affordances, not technical implementation
- Consider the persona's frustrations when identifying issues
- Note issues that span multiple screens (consistency, navigation flow)

Respond with a JSON object:
{
  "issues": [
    {
      "frameId": "<nodeId of the problematic frame>",
      "frameName": "<name of the frame>",
      "title": "<short issue title>",
      "description": "<detailed explanation including which screen and why it's problematic for this persona>",
      "severity": "<high|medium|low>",
      "category": "<accessibility|usability|flow|persona-specific>"
    }
  ],
  "journeyNarrative": "<A first-person narrative (3-5 sentences) of the persona describing their experience walking through this flow, expressing frustrations and confusion naturally>"
}

Identify 4-8 issues total across all screens. Prioritize issues that most impact the target persona's journey.`;

      contentPayload = [
        { type: "text", text: systemPrompt },
        ...frames.map((frame, i) => ({
          type: "image_url",
          image_url: { url: frame.imageData }
        }))
      ];
    } else {
      // Single frame analysis
      systemPrompt = `You are a UX accessibility and usability expert analyzing a UI design.

Context: You are evaluating this interface for "${personaName}" - ${description}.
Their frustrations: ${frustrations}
Their goals: ${goals}

Analyze this UI image and identify usability issues. Focus on:

1. **Accessibility Issues**:
   - Touch targets smaller than 44x44px
   - Low contrast text (less than 4.5:1 ratio)
   - Missing labels or alt text indicators
   - Color-only information conveyance

2. **Usability Issues**:
   - Unclear call-to-action buttons
   - Confusing navigation patterns
   - Information overload
   - Inconsistent visual hierarchy

3. **Persona-Specific Issues**:
   - Elements that conflict with the persona's frustrations
   - Barriers to achieving the persona's goals

Respond with a JSON object:
{
  "issues": [
    {
      "frameId": "${frames[0].nodeId}",
      "frameName": "${frames[0].name}",
      "title": "<Short issue title>",
      "description": "<Detailed explanation including location and why it's problematic for this persona>",
      "severity": "<high|medium|low>",
      "category": "<accessibility|usability|persona-specific>"
    }
  ],
  "journeyNarrative": "<A first-person sentence of the persona describing their first impression of this screen>"
}

Identify 3-6 issues. Prioritize issues that would most impact the target persona.`;

      contentPayload = [
        { type: "text", text: systemPrompt },
        { type: "image_url", image_url: { url: frames[0].imageData } }
      ];
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "user",
              content: contentPayload,
            },
          ],
          max_tokens: 4096,
          temperature: 0.5,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI Error:", errorText);

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
            error: "Payment required. Please add credits to your Lovable workspace.",
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
            category: "system"
          }],
          journeyNarrative: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const issues: AuditIssue[] = (result.issues || []).slice(0, 10).map((issue: any) => ({
      frameId: issue.frameId || frames[0].nodeId,
      frameName: issue.frameName || frames[0].name,
      title: issue.title || "Unnamed Issue",
      description: issue.description || "No description provided",
      severity: ["high", "medium", "low"].includes(issue.severity) ? issue.severity : "medium",
      category: issue.category || "usability"
    }));

    console.log(`Audit complete: ${issues.length} issues found`);

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
