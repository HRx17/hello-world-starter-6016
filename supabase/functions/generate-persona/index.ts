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

    const { studyPlanId, observationIds } = await req.json();
    
    console.log('Generating AI persona for user:', user.id, 'studyPlanId:', studyPlanId);

    // Fetch study plan if provided
    let studyPlan = null;
    if (studyPlanId) {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', studyPlanId)
        .single();
      
      if (error) {
        console.error('Error fetching study plan:', error);
      } else {
        studyPlan = data;
      }
    }

    // Fetch observations if provided
    let observations: any[] = [];
    if (observationIds && observationIds.length > 0) {
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .in('id', observationIds);
      
      if (error) {
        console.error('Error fetching observations:', error);
      } else {
        observations = data || [];
      }
    } else if (studyPlanId) {
      // If no specific observations, get all observations for the study
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .eq('study_plan_id', studyPlanId);
      
      if (error) {
        console.error('Error fetching study observations:', error);
      } else {
        observations = data || [];
      }
    }

    // Build context for AI
    let contextText = '';
    
    if (studyPlan) {
      contextText += `## Research Study Context\n`;
      contextText += `**Title:** ${studyPlan.title}\n`;
      contextText += `**Problem Statement:** ${studyPlan.problem_statement}\n`;
      contextText += `**Solution Goal:** ${studyPlan.solution_goal}\n`;
      if (studyPlan.participant_criteria) {
        contextText += `**Target Participants:** ${studyPlan.participant_criteria}\n`;
      }
      if (studyPlan.research_methods && studyPlan.research_methods.length > 0) {
        contextText += `**Research Methods:** ${studyPlan.research_methods.join(', ')}\n`;
      }
      contextText += '\n';
    }

    if (observations.length > 0) {
      contextText += `## Research Observations (${observations.length} total)\n`;
      observations.forEach((obs, index) => {
        contextText += `\n### Observation ${index + 1} (${obs.observation_type})\n`;
        contextText += `${obs.content}\n`;
        if (obs.tags && obs.tags.length > 0) {
          contextText += `Tags: ${obs.tags.join(', ')}\n`;
        }
      });
    }

    if (!contextText.trim()) {
      return new Response(
        JSON.stringify({ error: 'No study plan or observations provided to generate persona from' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `You are a UX research expert specializing in creating user personas. Based on the provided research context (study plans, observations, interview notes), generate a realistic and actionable user persona.

Your response MUST be valid JSON with the following structure:
{
  "name": "A descriptive persona name (e.g., 'Alex the Efficiency Seeker')",
  "description": "A 2-3 sentence summary of who this persona is",
  "demographics": {
    "age": "Age or age range (e.g., '28-35')",
    "occupation": "Job title or role",
    "tech_savviness": "Level and description (e.g., 'High - Early adopter')"
  },
  "goals": ["Array of 3-5 user goals"],
  "pain_points": ["Array of 3-5 frustrations or challenges"],
  "behaviors": {
    "habits": "Key behavioral patterns",
    "preferences": "How they prefer to interact",
    "motivations": "What drives their decisions"
  }
}

Guidelines:
- Make the persona specific and grounded in the research data
- Goals should be actionable and measurable
- Pain points should relate to the problem space
- The persona should feel like a real person, not a stereotype
- If research data is limited, make reasonable inferences but stay grounded`;

    const userPrompt = `Based on the following research context, generate a detailed user persona:

${contextText}

Generate a persona that represents the key user patterns and needs identified in this research.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const personaJson = data.choices[0].message.content;
    
    let persona;
    try {
      persona = JSON.parse(personaJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', personaJson);
      throw new Error('Failed to parse AI response as JSON');
    }

    console.log('Successfully generated persona:', persona.name);

    return new Response(
      JSON.stringify({ persona }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-persona:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
