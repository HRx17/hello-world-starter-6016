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
    const { stepTitle, stepDescription, studyContext } = await req.json();
    console.log('Getting guidance for step:', stepTitle);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a UX research assistant helping researchers complete their study steps effectively. 
    
For the given research step, provide:
1. A clear overview of what needs to be done
2. Specific action items (3-5 concrete tasks)
3. Best practices and tips
4. Templates or frameworks when applicable
5. Common pitfalls to avoid
6. Expected outcomes

Be practical, actionable, and specific to UX research methodologies. Format your response in clear sections.`;

    const userPrompt = `Research Step: ${stepTitle}
Description: ${stepDescription}
Study Context: ${studyContext}

Please provide comprehensive guidance for completing this step effectively.`;

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
      throw new Error('Failed to generate guidance');
    }

    const data = await response.json();
    const guidance = data.choices[0].message.content;
    console.log('Generated guidance successfully');

    return new Response(
      JSON.stringify({ guidance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-step-guidance function:', error);
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