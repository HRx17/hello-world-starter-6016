import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-connect-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get connect key from header
    const connectKey = req.headers.get("x-connect-key");
    if (!connectKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing connect key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate connect key and get user_id
    const { data: userId, error: keyError } = await supabase.rpc(
      "get_user_from_connect_key",
      { key: connectKey }
    );

    if (keyError || !userId) {
      console.error("Invalid connect key:", keyError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or inactive connect key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Route handling
    if (req.method === "POST" && path === "import-flow") {
      // INCOMING: Receive flow data from Figma
      return await handleImportFlow(supabase, userId, connectKey, req);
    } else if (req.method === "GET" && path === "personas") {
      // OUTGOING: Send personas to Figma
      return await handleGetPersonas(supabase, userId);
    } else if (req.method === "GET" && path === "journeys") {
      // OUTGOING: Send journey maps to Figma
      return await handleGetJourneys(supabase, userId);
    } else if (req.method === "GET" && path === "validate") {
      // Validate connection
      return await handleValidateConnection(supabase, userId, connectKey);
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unknown endpoint",
          availableEndpoints: [
            "POST /import-flow - Import user flow from Figma",
            "GET /personas - Get all personas",
            "GET /journeys - Get all journey maps",
            "GET /validate - Validate connection"
          ]
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Figma bridge error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Import flow from Figma
async function handleImportFlow(
  supabase: any,
  userId: string,
  connectKey: string,
  req: Request
) {
  const body = await req.json();
  
  const { name, description, steps, screenshots, figmaFileKey, figmaFileName } = body;

  if (!name || !steps) {
    return new Response(
      JSON.stringify({ success: false, error: "Name and steps are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get connection ID
  const { data: connection } = await supabase
    .from("figma_connections")
    .select("id")
    .eq("connect_key", connectKey)
    .single();

  // Insert the flow
  const { data: flow, error: flowError } = await supabase
    .from("figma_flows")
    .insert({
      user_id: userId,
      connection_id: connection?.id,
      name,
      description,
      steps,
      screenshots: screenshots || [],
      figma_file_key: figmaFileKey,
      figma_file_name: figmaFileName,
      status: "imported",
    })
    .select()
    .single();

  if (flowError) {
    console.error("Error creating flow:", flowError);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to save flow" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update last_sync_at on connection
  await supabase
    .from("figma_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("connect_key", connectKey);

  console.log(`Flow imported: ${flow.id} for user ${userId}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      flowId: flow.id,
      message: "Flow imported successfully"
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get personas for Figma
async function handleGetPersonas(supabase: any, userId: string) {
  const { data: personas, error } = await supabase
    .from("personas")
    .select("id, name, description, goals, pain_points, behaviors, demographics, avatar_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching personas:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch personas" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      personas: personas || [],
      count: personas?.length || 0
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Get journey maps for Figma
async function handleGetJourneys(supabase: any, userId: string) {
  const { data: journeys, error } = await supabase
    .from("user_journey_maps")
    .select("id, title, journey_data, persona_id, ai_generated, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching journeys:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to fetch journey maps" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      journeys: journeys || [],
      count: journeys?.length || 0
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Validate connection
async function handleValidateConnection(supabase: any, userId: string, connectKey: string) {
  const { data: connection, error } = await supabase
    .from("figma_connections")
    .select("id, name, created_at, last_sync_at")
    .eq("connect_key", connectKey)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: "Connection not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get counts
  const { count: personaCount } = await supabase
    .from("personas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: journeyCount } = await supabase
    .from("user_journey_maps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      connection: {
        id: connection.id,
        name: connection.name,
        createdAt: connection.created_at,
        lastSyncAt: connection.last_sync_at,
      },
      availableData: {
        personas: personaCount || 0,
        journeyMaps: journeyCount || 0,
      }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
