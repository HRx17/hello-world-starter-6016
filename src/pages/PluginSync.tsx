import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Link2, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw,
  User,
  Map,
  FileImage,
  ExternalLink,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FigmaConnection {
  id: string;
  connect_key: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface FigmaFlow {
  id: string;
  name: string;
  description: string | null;
  figma_file_name: string | null;
  status: string;
  created_at: string;
  steps: any[];
}

export default function PluginSync() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newConnectionName, setNewConnectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch connections
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["figma-connections", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("figma_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FigmaConnection[];
    },
    enabled: !!user,
  });

  // Fetch imported flows
  const { data: flows, isLoading: flowsLoading } = useQuery({
    queryKey: ["figma-flows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("figma_flows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as FigmaFlow[];
    },
    enabled: !!user,
  });

  // Fetch counts for display
  const { data: counts } = useQuery({
    queryKey: ["sync-counts", user?.id],
    queryFn: async () => {
      if (!user) return { personas: 0, journeys: 0 };
      
      const [personaRes, journeyRes] = await Promise.all([
        supabase.from("personas").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_journey_maps").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      
      return {
        personas: personaRes.count || 0,
        journeys: journeyRes.count || 0,
      };
    },
    enabled: !!user,
  });

  // Create connection mutation
  const createConnection = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("figma_connections")
        .insert({ user_id: user.id, name: name || "My Figma Connection" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["figma-connections"] });
      setNewConnectionName("");
      setIsCreating(false);
      toast({ title: "Connection created", description: "Your new connect key is ready to use." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create connection", description: error.message, variant: "destructive" });
    },
  });

  // Delete connection mutation
  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("figma_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["figma-connections"] });
      toast({ title: "Connection deleted" });
    },
  });

  const copyToClipboard = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const apiBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/figma-bridge`;

  return (
    <DashboardLayout>
      <div className="w-full p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Plugin Sync
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your Figma plugin to sync designs and research data bidirectionally.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Connections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connect Keys */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      Connect Keys
                    </CardTitle>
                    <CardDescription>
                      Use these keys in your Figma plugin to authenticate
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    disabled={isCreating}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isCreating && (
                  <div className="flex gap-2 mb-4 p-4 bg-muted/50 rounded-lg">
                    <Input
                      placeholder="Connection name (optional)"
                      value={newConnectionName}
                      onChange={(e) => setNewConnectionName(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => createConnection.mutate(newConnectionName)}
                      disabled={createConnection.isPending}
                    >
                      {createConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                  </div>
                )}

                {connectionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : connections?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No connect keys yet</p>
                    <p className="text-sm">Create one to start syncing with Figma</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {connections?.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{conn.name}</h4>
                            <Badge variant={conn.is_active ? "default" : "secondary"}>
                              {conn.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                              {conn.connect_key.slice(0, 8)}...{conn.connect_key.slice(-4)}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => copyToClipboard(conn.connect_key)}
                            >
                              {copiedKey === conn.connect_key ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {conn.last_sync_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last sync: {format(new Date(conn.last_sync_at), "PPp")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteConnection.mutate(conn.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Imported Flows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5" />
                  Imported Flows
                </CardTitle>
                <CardDescription>
                  User flows and screenshots received from Figma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flowsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : flows?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No flows imported yet</p>
                    <p className="text-sm">Use the Figma plugin to send flows here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flows?.map((flow) => (
                      <div
                        key={flow.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                      >
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{flow.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {flow.steps?.length || 0} steps
                            {flow.figma_file_name && ` • ${flow.figma_file_name}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Imported {format(new Date(flow.created_at), "PPp")}
                          </p>
                        </div>
                        <Badge variant="outline">{flow.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - API Info */}
          <div className="space-y-6">
            {/* Available Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available for Sync</CardTitle>
                <CardDescription>
                  Data that can be pulled from UX Probe into Figma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Personas</p>
                      <p className="text-sm text-muted-foreground">User profiles & traits</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{counts?.personas || 0}</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Map className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Journey Maps</p>
                      <p className="text-sm text-muted-foreground">User flows & touchpoints</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{counts?.journeys || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  API Endpoints
                </CardTitle>
                <CardDescription>
                  For Figma plugin developers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Base URL</p>
                  <code className="text-xs break-all">{apiBaseUrl}</code>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-green-600">GET /personas</p>
                    <p className="text-muted-foreground text-xs">Fetch all personas</p>
                  </div>
                  <div>
                    <p className="font-medium text-green-600">GET /journeys</p>
                    <p className="text-muted-foreground text-xs">Fetch all journey maps</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600">POST /import-flow</p>
                    <p className="text-muted-foreground text-xs">Send flow from Figma</p>
                  </div>
                  <div>
                    <p className="font-medium text-amber-600">GET /validate</p>
                    <p className="text-muted-foreground text-xs">Validate connection</p>
                  </div>
                </div>

                <Separator />

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Include <code className="bg-muted px-1 rounded">x-connect-key</code> header 
                      with your connect key in all requests.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
