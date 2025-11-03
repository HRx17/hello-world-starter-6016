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
import { ArrowLeft, Plus, Trash2, Tag, Pencil, Filter, Search, Download } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const observationTypes = [
  'pain_point',
  'need',
  'behavior',
  'quote',
  'insight',
  'idea',
  'question',
  'note',
];

const clusterColors = [
  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
];

export default function ObservationsBoard() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Add observation state
  const [newObsContent, setNewObsContent] = useState("");
  const [newObsType, setNewObsType] = useState<string>("note");
  const [newObsTags, setNewObsTags] = useState("");
  
  // Cluster state
  const [newClusterTitle, setNewClusterTitle] = useState("");
  const [newClusterDescription, setNewClusterDescription] = useState("");
  const [showNewCluster, setShowNewCluster] = useState(false);
  
  // Edit observation state
  const [editingObs, setEditingObs] = useState<any>(null);
  const [editObsContent, setEditObsContent] = useState("");
  const [editObsType, setEditObsType] = useState("");
  const [editObsTags, setEditObsTags] = useState("");
  
  // Edit cluster state
  const [editingCluster, setEditingCluster] = useState<any>(null);
  const [editClusterTitle, setEditClusterTitle] = useState("");
  const [editClusterDescription, setEditClusterDescription] = useState("");
  const [editClusterSummary, setEditClusterSummary] = useState("");
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

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

  const editObservationMutation = useMutation({
    mutationFn: async () => {
      const tags = editObsTags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('research_observations')
        .update({
          content: editObsContent,
          observation_type: editObsType,
          tags,
        })
        .eq('id', editingObs.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-observations', studyId] });
      setEditingObs(null);
      toast.success("Observation updated!");
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
          description: newClusterDescription,
          color: randomColor,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight-clusters', studyId] });
      setNewClusterTitle("");
      setNewClusterDescription("");
      setShowNewCluster(false);
      toast.success("Cluster created!");
    },
  });

  const editClusterMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('insight_clusters')
        .update({
          title: editClusterTitle,
          description: editClusterDescription,
          summary: editClusterSummary,
        })
        .eq('id', editingCluster.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight-clusters', studyId] });
      setEditingCluster(null);
      toast.success("Cluster updated!");
    },
  });

  const deleteClusterMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      // First, unassign all observations from this cluster
      const { error: unassignError } = await supabase
        .from('research_observations')
        .update({ cluster_id: null })
        .eq('cluster_id', clusterId);

      if (unassignError) throw unassignError;

      // Then delete the cluster
      const { error } = await supabase
        .from('insight_clusters')
        .delete()
        .eq('id', clusterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insight-clusters', studyId] });
      queryClient.invalidateQueries({ queryKey: ['study-observations', studyId] });
      toast.success("Cluster deleted!");
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

  const exportCluster = (cluster: any) => {
    const clusterObs = observations?.filter(obs => obs.cluster_id === cluster.id) || [];
    const content = `
INSIGHT CLUSTER: ${cluster.title}
${'='.repeat(cluster.title.length + 17)}

${cluster.description ? `Description: ${cluster.description}\n` : ''}
${cluster.summary ? `Summary: ${cluster.summary}\n` : ''}

Total Observations: ${clusterObs.length}

OBSERVATIONS:
${clusterObs.map((obs, i) => `
${i + 1}. [${obs.observation_type}] ${obs.content}
   ${obs.tags?.length ? `Tags: ${obs.tags.join(', ')}` : ''}
`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-${cluster.title.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Cluster exported!");
  };

  const openEditObs = (obs: any) => {
    setEditingObs(obs);
    setEditObsContent(obs.content);
    setEditObsType(obs.observation_type);
    setEditObsTags(obs.tags?.join(', ') || '');
  };

  const openEditCluster = (cluster: any) => {
    setEditingCluster(cluster);
    setEditClusterTitle(cluster.title);
    setEditClusterDescription(cluster.description || '');
    setEditClusterSummary(cluster.summary || '');
  };

  // Filter observations
  const filteredObservations = observations?.filter(obs => {
    const matchesSearch = searchQuery === "" || 
      obs.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || obs.observation_type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const unclustered = filteredObservations.filter(obs => !obs.cluster_id);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/research')}>
            Research
          </Button>
          <span>/</span>
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/research/study/${studyId}`)}>
            Study
          </Button>
          <span>/</span>
          <span>Observations</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${studyId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">Affinity Mapping</h1>
            <p className="text-muted-foreground mt-1">Organize and cluster your research observations</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search observations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {observationTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
                    <CardDescription>Assign observations to clusters below</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {unclustered.length > 0 ? (
                  <div className="grid gap-3">
                    {unclustered.map((obs) => (
                      <div key={obs.id} className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <Badge className="mb-1">{obs.observation_type}</Badge>
                            <p className="text-sm">{obs.content}</p>
                            {obs.tags && obs.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {obs.tags.map((tag: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    <Tag className="mr-1 h-3 w-3" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditObs(obs)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Observation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this observation.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteObservationMutation.mutate(obs.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {searchQuery || filterType !== "all" 
                      ? "No observations match your filters" 
                      : "All observations are clustered"}
                  </p>
                )}
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
                  <Textarea
                    placeholder="Description (optional)"
                    value={newClusterDescription}
                    onChange={(e) => setNewClusterDescription(e.target.value)}
                    rows={2}
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
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle>{cluster.title}</CardTitle>
                            {cluster.description && (
                              <CardDescription className="mt-1">{cluster.description}</CardDescription>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">{clusterObs.length} observations</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditCluster(cluster)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => exportCluster(cluster)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Cluster</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the cluster and unassign {clusterObs.length} observation(s). The observations will not be deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteClusterMutation.mutate(cluster.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {cluster.summary && (
                          <div className="mb-4 p-3 bg-background/50 rounded border">
                            <p className="text-sm font-semibold mb-1">Summary:</p>
                            <p className="text-sm">{cluster.summary}</p>
                          </div>
                        )}
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

        {/* Edit Observation Dialog */}
        <Dialog open={!!editingObs} onOpenChange={(open) => !open && setEditingObs(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Observation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={editObsType} onValueChange={setEditObsType}>
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
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editObsContent}
                  onChange={(e) => setEditObsContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label>Tags</Label>
                <Input
                  value={editObsTags}
                  onChange={(e) => setEditObsTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingObs(null)}>
                Cancel
              </Button>
              <Button onClick={() => editObservationMutation.mutate()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Cluster Dialog */}
        <Dialog open={!!editingCluster} onOpenChange={(open) => !open && setEditingCluster(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Cluster</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editClusterTitle}
                  onChange={(e) => setEditClusterTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editClusterDescription}
                  onChange={(e) => setEditClusterDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label>Summary/Insights</Label>
                <Textarea
                  value={editClusterSummary}
                  onChange={(e) => setEditClusterSummary(e.target.value)}
                  rows={3}
                  placeholder="Synthesize the key insights from this cluster..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCluster(null)}>
                Cancel
              </Button>
              <Button onClick={() => editClusterMutation.mutate()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}