import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, heuristics } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('Google AI API key not configured');
    }

    // Use selected heuristics or default Nielsen's 10
    const selectedHeuristics = heuristics || [
      "visibility_of_system_status",
      "match_between_system_and_real_world",
      "user_control_and_freedom",
      "consistency_and_standards",
      "error_prevention",
      "recognition_rather_than_recall",
      "flexibility_and_efficiency_of_use",
      "aesthetic_and_minimalist_design",
      "help_users_recognize_diagnose_and_recover_from_errors",
      "help_and_documentation"
    ];

    console.log('Analyzing screenshot with AI...');

    // Call Google AI Vision API
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `You are a UX expert analyzing a design screenshot for usability heuristic violations.

IMPORTANT: Analyze the image carefully and identify specific usability issues based on Nielsen's 10 Usability Heuristics.

For each violation found, provide:
1. heuristic: The specific heuristic violated (from: ${selectedHeuristics.join(', ')})
2. severity: critical, major, minor, or info
3. title: Brief description of the issue
4. description: Detailed explanation of what's wrong and why it matters
5. suggestion: Specific recommendation to fix the issue
6. location: Describe where on the screen the issue is located

Also identify strengths (things done well).

Return your analysis in this exact JSON format:
{
  "violations": [
    {
      "heuristic": "string",
      "severity": "critical|major|minor|info",
      "title": "string",
      "description": "string",
      "suggestion": "string",
      "location": "string"
    }
  ],
  "strengths": [
    {
      "heuristic": "string",
      "title": "string",
      "description": "string"
    }
  ]
}

Be thorough but realistic. Look for actual usability issues, not just nitpicks.`
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageUrl.split(',')[1] || imageUrl
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received');

    // Parse AI response
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Calculate score based on violations
    const violationWeights = {
      critical: 25,
      major: 15,
      minor: 5,
      info: 2
    };

    let totalDeductions = 0;
    analysis.violations.forEach((v: any) => {
      totalDeductions += violationWeights[v.severity as keyof typeof violationWeights] || 0;
    });

    const score = Math.max(0, Math.min(100, 100 - totalDeductions));

    return new Response(
      JSON.stringify({
        success: true,
        score: score,
        violations: analysis.violations || [],
        strengths: analysis.strengths || [],
        analyzedAt: new Date().toISOString(),
        metadata: {
          heuristicsUsed: selectedHeuristics,
          totalViolations: analysis.violations?.length || 0,
          criticalCount: analysis.violations?.filter((v: any) => v.severity === 'critical').length || 0,
          majorCount: analysis.violations?.filter((v: any) => v.severity === 'major').length || 0,
          minorCount: analysis.violations?.filter((v: any) => v.severity === 'minor').length || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in analyze-screenshot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});