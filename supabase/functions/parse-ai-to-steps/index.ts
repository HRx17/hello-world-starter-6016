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

    const { aiSuggestions } = await req.json();
    
    // Input validation
    if (!aiSuggestions) {
      throw new Error('AI suggestions are required');
    }

    if (typeof aiSuggestions !== 'string' || aiSuggestions.length > 20000) {
      throw new Error('AI suggestions must be a string with max 20000 characters');
    }

    console.log('Parsing AI suggestions to steps for user:', user.id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a UX research assistant. Parse the given study plan into clear, actionable steps. Each step should be a discrete task that can be completed. Return ONLY a JSON array of step objects with format: [{"title": "Step title", "description": "Brief description", "order": 1}]. Do not include any markdown formatting or explanations, just the JSON array.'
          },
          {
            role: 'user',
            content: `Parse this study plan into actionable steps:\n\n${aiSuggestions}`
          }
        ],
        temperature: 0.3,
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
      throw new Error('Failed to parse suggestions');
    }

    const data = await response.json();
    const parsedText = data.choices[0].message.content;
    console.log('AI response:', parsedText);

    let steps;
    try {
      const cleanedText = parsedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      steps = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      steps = [{
        title: 'Review AI Suggestions',
        description: 'Review and break down the AI suggestions manually',
        order: 1
      }];
    }

    const stepsWithMetadata = steps.map((step: any, index: number) => ({
      id: crypto.randomUUID(),
      title: step.title || `Step ${index + 1}`,
      description: step.description || '',
      order: step.order || index + 1,
      completed: false,
      created_at: new Date().toISOString()
    }));

    console.log('Parsed steps:', stepsWithMetadata);

    return new Response(
      JSON.stringify({ steps: stepsWithMetadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-ai-to-steps function:', error);
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
