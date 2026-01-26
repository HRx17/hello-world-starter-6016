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

interface AuditIssue {
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
    const { imageData, persona } = await req.json() as { 
      imageData: string; 
      persona: Persona;
    };

    if (!imageData) {
      throw new Error("Image data is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Lovable AI API key not configured");
    }

    // Build persona context
    const frustrations = persona?.painPoints?.join(", ") || "general usability concerns";
    const goals = persona?.goals?.join(", ") || "completing tasks efficiently";
    const description = persona?.description || "a typical user";
    const personaName = persona?.name || "User";

    console.log(`Running Figma audit for persona: ${personaName}`);

    const systemPrompt = `You are a UX accessibility and usability expert analyzing a UI design from Figma.

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

Respond with a JSON object containing an array of issues:
{
  "issues": [
    {
      "title": "<Short issue title>",
      "description": "<Detailed explanation including location and why it's problematic for this persona>",
      "severity": "<high|medium|low>",
      "category": "<accessibility|usability|persona-specific>"
    }
  ]
}

Identify 3-6 issues. Prioritize issues that would most impact the target persona.
Do not include issues about layer naming or technical Figma organization - focus on visual design issues.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systemPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageData,
                  },
                },
              ],
            },
          ],
          max_tokens: 2048,
          temperature: 0.4,
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
            title: "Analysis Complete",
            description: "AI analysis completed but returned unexpected format. Manual review recommended.",
            severity: "low",
            category: "system"
          }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const issues: AuditIssue[] = (result.issues || []).slice(0, 6).map((issue: any) => ({
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in figma-audit-ai:", error);
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
