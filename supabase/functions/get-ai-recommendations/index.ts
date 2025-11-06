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

    const { violation, framework, url } = await req.json();
    
    // Input validation
    if (!violation || !url) {
      throw new Error('Missing required parameters');
    }

    if (typeof url !== 'string' || url.length > 2048) {
      throw new Error('Invalid URL');
    }

    if (framework && typeof framework !== 'string') {
      throw new Error('Invalid framework');
    }
    
    console.log('Generating AI recommendations for violation:', violation.heuristic, 'User:', user.id);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const frameworkContext = framework ? `The website is built with ${framework}.` : '';
    const elementContext = violation.element ? `The issue is in this element: ${violation.element}` : '';
    
    const systemPrompt = `You are a UX expert specializing in Nielsen's 10 Usability Heuristics. Provide specific, actionable recommendations to fix usability violations. 
    
Your response should include:
1. A clear explanation of WHY this is a problem
2. Specific steps to fix it
3. Code examples when applicable (HTML/CSS/JavaScript)
4. Best practices to prevent similar issues

Be concise but thorough. Focus on practical implementation.`;

    const userPrompt = `Website: ${url}
${frameworkContext}

Violation Details:
- Heuristic: ${violation.heuristic}
- Severity: ${violation.severity}
- Description: ${violation.description}
${elementContext}

Provide specific recommendations to fix this usability issue. Include code examples if relevant to the framework.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment." 
          }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI credits depleted. Please add credits to continue." 
          }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices[0].message.content;

    console.log('Successfully generated recommendations');

    return new Response(
      JSON.stringify({ recommendation }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-ai-recommendations:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
