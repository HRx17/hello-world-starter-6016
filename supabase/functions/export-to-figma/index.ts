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
    const { exportType, data, figmaAccessToken } = await req.json();
    console.log('Exporting to Figma:', exportType);

    if (!figmaAccessToken) {
      throw new Error('Figma access token is required');
    }

    // Convert data to Figma-compatible format
    let figmaData;
    
    switch (exportType) {
      case 'mind_map':
        figmaData = convertMindMapToFigma(data);
        break;
      case 'information_architecture':
        figmaData = convertIAToFigma(data);
        break;
      case 'user_journey_map':
        figmaData = convertJourneyToFigma(data);
        break;
      case 'observations':
        figmaData = convertObservationsToFigma(data);
        break;
      default:
        throw new Error('Unsupported export type');
    }

    // Create Figma file using Figma API
    const figmaResponse = await fetch('https://api.figma.com/v1/files', {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaAccessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `UX Research - ${exportType} - ${new Date().toLocaleDateString()}`,
        ...figmaData,
      }),
    });

    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      console.error('Figma API error:', figmaResponse.status, errorText);
      throw new Error('Failed to create Figma file');
    }

    const figmaResult = await figmaResponse.json();
    console.log('Exported to Figma successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        figmaFileUrl: `https://www.figma.com/file/${figmaResult.key}`,
        fileKey: figmaResult.key 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in export-to-figma function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper functions to convert data to Figma format
function convertMindMapToFigma(data: any) {
  return {
    document: {
      name: 'Mind Map',
      type: 'CANVAS',
      children: data.branches?.map((branch: any, index: number) => ({
        name: branch.label,
        type: 'FRAME',
        x: index * 300,
        y: 0,
        width: 250,
        height: 150,
        fills: [{ type: 'SOLID', color: hexToRgb(branch.color || '#000000') }],
      })) || [],
    },
  };
}

function convertIAToFigma(data: any) {
  return {
    document: {
      name: 'Information Architecture',
      type: 'CANVAS',
      children: data.hierarchy?.map((section: any, index: number) => ({
        name: section.label,
        type: 'FRAME',
        x: 0,
        y: index * 200,
        width: 400,
        height: 150,
      })) || [],
    },
  };
}

function convertJourneyToFigma(data: any) {
  return {
    document: {
      name: 'User Journey Map',
      type: 'CANVAS',
      children: data.stages?.map((stage: any, index: number) => ({
        name: stage.name,
        type: 'FRAME',
        x: index * 350,
        y: 0,
        width: 300,
        height: 400,
      })) || [],
    },
  };
}

function convertObservationsToFigma(data: any) {
  return {
    document: {
      name: 'Research Observations',
      type: 'CANVAS',
      children: data.observations?.map((obs: any, index: number) => ({
        name: `Observation ${index + 1}`,
        type: 'TEXT',
        x: 0,
        y: index * 100,
        characters: obs.content || '',
      })) || [],
    },
  };
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
}