import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, context, studyData } = await req.json();
    console.log('Generating mind map for topic:', topic);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a UX research expert specializing in mind mapping and visual thinking. 
    
Create a comprehensive mind map structure in JSON format with:
1. A central topic/theme
2. Main branches (3-6 key areas)
3. Sub-branches with specific details
4. Connections between related concepts
5. Color coding for different categories

Format as JSON:
{
  "centralTopic": "Main topic",
  "branches": [
    {
      "id": "unique_id",
      "label": "Branch label",
      "color": "#hex_color",
      "children": [
        { "id": "unique_id", "label": "Sub-branch", "notes": "Details" }
      ]
    }
  ],
  "connections": [
    { "from": "id1", "to": "id2", "label": "relationship" }
  ]
}`;

    const userPrompt = `Topic: ${topic}
Context: ${context || 'General UX research'}
${studyData ? `Study Information: ${JSON.stringify(studyData)}` : ''}

Please create a detailed mind map that helps visualize and organize this UX research topic.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limits exceeded');
      }
      if (response.status === 402) {
        throw new Error('Payment required');
      }
      throw new Error('Failed to generate mind map');
    }

    const data = await response.json();
    const mindMapContent = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    let mindMapData;
    try {
      const jsonMatch = mindMapContent.match(/\{[\s\S]*\}/);
      mindMapData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse mind map', raw: mindMapContent };
    } catch (e) {
      mindMapData = { error: 'Could not parse mind map', raw: mindMapContent };
    }

    console.log('Generated mind map successfully');

    return new Response(
      JSON.stringify({ mindMap: mindMapData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-mind-map function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage.includes('Rate limits') ? 429 : 
                errorMessage.includes('Payment required') ? 402 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});