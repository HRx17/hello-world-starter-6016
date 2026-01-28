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
  behaviors?: Record<string, any>;
  demographics?: Record<string, any>;
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

    if (!persona || !persona.name) {
      throw new Error("Persona is required");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Build persona context
    const frustrations = persona.painPoints?.join(", ") || "general usability concerns";
    const goals = persona.goals?.join(", ") || "completing tasks efficiently";
    const description = persona.description || "a typical user";

    console.log(`Running persona simulation for: ${persona.name}`);

    const systemPrompt = `You are a UX Researcher acting as "${persona.name}" - ${description}.

Your frustrations: ${frustrations}
Your goals: ${goals}

Analyze this interface image. Identify exactly 3 specific areas where you would struggle based on your traits and frustrations. 

IMPORTANT: 
- Ignore layer naming; focus purely on visual affordances
- Think from the perspective of this specific persona
- Consider the persona's frustrations when identifying friction points
- Be specific about WHERE on the screen each issue occurs

Respond with a JSON object in this exact format:
{
  "frictionPoints": [
    {
      "id": 1,
      "x": <percentage 0-100 from left edge>,
      "y": <percentage 0-100 from top edge>,
      "title": "<short title of the issue>",
      "description": "<detailed explanation of why this is a problem for this persona>",
      "severity": "<high|medium|low based on impact>"
    },
    {
      "id": 2,
      ...
    },
    {
      "id": 3,
      ...
    }
  ],
  "monologue": "<A first-person narrative (2-3 sentences) of the persona describing their experience trying to use this interface, expressing their frustrations naturally>"
}

The x,y coordinates should point to the CENTER of the problematic UI element.
Ensure exactly 3 friction points are identified.`;

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
          temperature: 0.7,
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
            error: "Rate limit exceeded. Please try again in a moment." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Payment required. Please check your OpenAI billing." 
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
      throw new Error("Failed to parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    if (!result.frictionPoints || !Array.isArray(result.frictionPoints)) {
      throw new Error("Invalid response format: missing frictionPoints");
    }

    // Ensure we have exactly 3 friction points with valid data
    const frictionPoints = result.frictionPoints.slice(0, 3).map((point: any, index: number) => ({
      id: index + 1,
      x: Math.max(5, Math.min(95, Number(point.x) || 50)),
      y: Math.max(5, Math.min(95, Number(point.y) || 50)),
      title: point.title || `Issue ${index + 1}`,
      description: point.description || "No description provided",
      severity: ["high", "medium", "low"].includes(point.severity) ? point.severity : "medium",
    }));

    const monologue = result.monologue || 
      `As ${persona.name}, I found this interface challenging to navigate given my needs.`;

    console.log(`Simulation complete: ${frictionPoints.length} friction points found`);

    return new Response(
      JSON.stringify({
        success: true,
        frictionPoints,
        monologue,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in simulate-persona-audit:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
