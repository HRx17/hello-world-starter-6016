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
    const { persona, scenario, studyData } = await req.json();
    console.log('Generating user journey map for persona:', persona?.name || 'Unknown');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a UX research expert specializing in user journey mapping. 
    
Create a comprehensive user journey map in JSON format with:
1. Journey stages (Awareness, Consideration, Purchase, Retention, Advocacy)
2. User actions at each stage
3. Touchpoints (where users interact)
4. User thoughts and feelings
5. Pain points and opportunities
6. Emotions (positive, neutral, negative)

Format as JSON:
{
  "title": "Journey title",
  "persona": "Persona name",
  "scenario": "Scenario description",
  "stages": [
    {
      "id": "unique_id",
      "name": "Stage name",
      "actions": ["Action 1", "Action 2"],
      "touchpoints": ["Touchpoint 1", "Touchpoint 2"],
      "thoughts": ["What user thinks"],
      "feelings": ["What user feels"],
      "painPoints": ["Pain point 1"],
      "opportunities": ["Opportunity 1"],
      "emotionLevel": 1-5 (1=very negative, 5=very positive)
    }
  ]
}`;

    const userPrompt = `${persona ? `Persona: ${JSON.stringify(persona)}` : ''}
Scenario: ${scenario || 'User interacts with the product/service'}
${studyData ? `Study Information: ${JSON.stringify(studyData)}` : ''}

Please create a detailed user journey map that captures the complete user experience.`;

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
      throw new Error('Failed to generate user journey map');
    }

    const data = await response.json();
    const journeyContent = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    let journeyData;
    try {
      const jsonMatch = journeyContent.match(/\{[\s\S]*\}/);
      journeyData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse journey', raw: journeyContent };
    } catch (e) {
      journeyData = { error: 'Could not parse journey', raw: journeyContent };
    }

    console.log('Generated user journey map successfully');

    return new Response(
      JSON.stringify({ userJourneyMap: journeyData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-user-journey-map function:', error);
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