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
    const { projectName, description, userNeeds, studyData } = await req.json();
    console.log('Generating information architecture for:', projectName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a UX research expert specializing in information architecture. 
    
Create a comprehensive information architecture structure in JSON format with:
1. Site hierarchy (navigation structure)
2. Content organization
3. Labeling system
4. Navigation patterns
5. Search and findability considerations

Format as JSON:
{
  "title": "Project name",
  "hierarchy": [
    {
      "id": "unique_id",
      "label": "Section name",
      "type": "page|section|feature",
      "description": "What this section contains",
      "children": [
        { "id": "unique_id", "label": "Subsection", "description": "Details" }
      ]
    }
  ],
  "navigation": {
    "primary": ["id1", "id2"],
    "secondary": ["id3", "id4"],
    "utility": ["id5", "id6"]
  },
  "taxonomies": [
    { "name": "Category name", "terms": ["term1", "term2"] }
  ]
}`;

    const userPrompt = `Project Name: ${projectName}
Description: ${description}
${userNeeds ? `User Needs: ${userNeeds}` : ''}
${studyData ? `Study Information: ${JSON.stringify(studyData)}` : ''}

Please create a detailed information architecture that organizes content effectively for users.`;

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
      throw new Error('Failed to generate information architecture');
    }

    const data = await response.json();
    const iaContent = data.choices[0].message.content;
    
    // Try to extract JSON from the response
    let iaData;
    try {
      const jsonMatch = iaContent.match(/\{[\s\S]*\}/);
      iaData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse IA', raw: iaContent };
    } catch (e) {
      iaData = { error: 'Could not parse IA', raw: iaContent };
    }

    console.log('Generated information architecture successfully');

    return new Response(
      JSON.stringify({ informationArchitecture: iaData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-information-architecture function:', error);
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