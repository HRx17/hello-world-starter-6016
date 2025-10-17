import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const observationTypes = [
  'pain_point',
  'need',
  'behavior',
  'quote',
  'insight',
  'idea',
  'question',
];

const clusterColors = [
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
];

export default function ObservationsBoard() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newObsContent, setNewObsContent] = useState("");
  const [newObsType, setNewObsType] = useState<string>("note");
  const [newObsTags, setNewObsTags] = useState("");
  const [newClusterTitle, setNewClusterTitle] = useState("");
  const [showNewCluster, setShowNewCluster] = useState(false);

  const { data: observations } = useQuery({
    queryKey: ['study-observations', studyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .eq('study_plan_id', studyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['insight-clusters', studyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insight_clusters')
        .select('*')
        .eq('study_plan_id', studyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const addObservationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tags = newObsTags.split(',').map(t => t.trim()).filter(Boolean);

      const { error } = await supabase
        .from('research_observations')
        .insert({
          user_id: user.id,
          study_plan_id: studyId,
          observation_type: newObsType,
          content: newObsContent,
          tags,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-observations', studyId] });
      setNewObsContent("");
      setNewObsTags("");
      toast.success("Observation added!");
    },
  });

  const createClusterMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const randomColor = clusterColors[Math.floor(Math.random() * clusterColors.length)];

      const { error } = await supabase
        .from('insight_clusters')
        .insert({
          user_id: user.id,
          study_plan_id: studyId,
          title: newClusterTitle,
          color: randomColor,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight-clusters', studyId] });
      setNewClusterTitle("");
      setShowNewCluster(false);
      toast.success("Cluster created!");
    },
  });

  const assignToClusterMutation = useMutation({
    mutationFn: async ({ observationId, clusterId }: { observationId: string; clusterId: string | null }) => {
      const { error } = await supabase
        .from('research_observations')
        .update({ cluster_id: clusterId })
        .eq('id', observationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-observations', studyId] });
      toast.success("Observation moved!");
    },
  });

  const deleteObservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('research_observations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-observations', studyId] });
      toast.success("Observation deleted!");
    },
  });

  const unclustered = observations?.filter(obs => !obs.cluster_id) || [];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${studyId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">Affinity Mapping</h1>
            <p className="text-muted-foreground mt-1">Organize and cluster your research observations</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Add Observation</CardTitle>
              <CardDescription>Record new insights from your research</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newObsType} onValueChange={setNewObsType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {observationTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observation</Label>
                <Textarea
                  placeholder="Enter your observation..."
                  value={newObsContent}
                  onChange={(e) => setNewObsContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  placeholder="navigation, mobile, frustration"
                  value={newObsTags}
                  onChange={(e) => setNewObsTags(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => addObservationMutation.mutate()} 
                disabled={!newObsContent.trim()}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Unclustered Observations ({unclustered.length})</CardTitle>
                    <CardDescription>Drag observations into clusters below</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {unclustered.map((obs) => (
                    <div key={obs.id} className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <Badge className="mb-1">{obs.observation_type}</Badge>
                          <p className="text-sm">{obs.content}</p>
                          {obs.tags && obs.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {obs.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Tag className="mr-1 h-3 w-3" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteObservationMutation.mutate(obs.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      {clusters && clusters.length > 0 && (
                        <Select 
                          value={obs.cluster_id || "none"} 
                          onValueChange={(value) => 
                            assignToClusterMutation.mutate({ 
                              observationId: obs.id, 
                              clusterId: value === "none" ? null : value 
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Assign to cluster" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No cluster</SelectItem>
                            {clusters.map(cluster => (
                              <SelectItem key={cluster.id} value={cluster.id}>
                                {cluster.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Insight Clusters</h2>
              <Button onClick={() => setShowNewCluster(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Cluster
              </Button>
            </div>

            {showNewCluster && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Cluster</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Cluster name (e.g., Navigation Issues)"
                    value={newClusterTitle}
                    onChange={(e) => setNewClusterTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => createClusterMutation.mutate()} disabled={!newClusterTitle.trim()}>
                      Create
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewCluster(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {clusters && clusters.length > 0 && (
              <div className="grid gap-4">
                {clusters.map((cluster) => {
                  const clusterObs = observations?.filter(obs => obs.cluster_id === cluster.id) || [];
                  return (
                    <Card key={cluster.id} className={cluster.color}>
                      <CardHeader>
                        <CardTitle>{cluster.title}</CardTitle>
                        <CardDescription>{clusterObs.length} observations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {clusterObs.map((obs) => (
                            <div key={obs.id} className="p-2 bg-background rounded text-sm">
                              <Badge className="mb-1 text-xs">{obs.observation_type}</Badge>
                              <p>{obs.content}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}