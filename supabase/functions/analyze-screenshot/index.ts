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

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
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

    console.log('Analyzing screenshot with OpenAI...');

    // Prepare the image data
    let imageData = imageUrl;
    if (imageUrl.startsWith('http')) {
      // If it's a URL, we need to fetch and convert to base64
      const imgResponse = await fetch(imageUrl);
      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      imageData = `data:image/jpeg;base64,${base64}`;
    }

    // Call OpenAI API with vision support
    const aiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Best for vision + reasoning
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
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
                  type: 'image_url',
                  image_url: {
                    url: imageData
                  }
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.4
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI Error:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please check your OpenAI billing.');
      }
      
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response received');

    // Parse AI response (OpenAI format)
    const aiText = aiData.choices?.[0]?.message?.content || '';
    console.log('Raw AI response length:', aiText.length);
    
    // Extract JSON from response - find the outermost balanced braces
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < aiText.length; i++) {
      if (aiText[i] === '{') {
        if (startIndex === -1) startIndex = i;
        braceCount++;
      } else if (aiText[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('No valid JSON found in AI response');
      throw new Error('Failed to parse AI response - no JSON object found');
    }

    const jsonString = aiText.substring(startIndex, endIndex);
    console.log('Extracted JSON length:', jsonString.length);
    
    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('JSON string preview:', jsonString.substring(0, 500));
      
      // Try to sanitize common issues
      const sanitized = jsonString
        .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      
      try {
        analysis = JSON.parse(sanitized);
      } catch (e) {
        throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }

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