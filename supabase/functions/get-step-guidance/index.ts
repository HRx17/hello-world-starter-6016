import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { stepTitle, stepDescription, studyContext } = await req.json();

    // Input validation
    if (!stepTitle || !stepDescription) {
      throw new Error('Step title and description are required');
    }

    if (typeof stepTitle !== 'string' || stepTitle.length > 500) {
      throw new Error('Step title must be a string with max 500 characters');
    }

    if (typeof stepDescription !== 'string' || stepDescription.length > 2000) {
      throw new Error('Step description must be a string with max 2000 characters');
    }

    if (studyContext && (typeof studyContext !== 'string' || studyContext.length > 5000)) {
      throw new Error('Study context must be a string with max 5000 characters');
    }

    console.log('Getting guidance for step:', stepTitle, 'User:', user.id);

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
