import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ExportDialog } from "@/components/ExportDialog";
import { downloadJSON, downloadHTML, generateMindMapHTML } from "@/lib/exportHelpers";

interface MindMapNode {
  id: string;
  label: string;
  parentId: string | null;
  notes?: string;
  level: number;
}

export default function MindMapping() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [centralTopic, setCentralTopic] = useState("");
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeNotes, setNewNodeNotes] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const { data: mindMaps, isLoading } = useQuery({
    queryKey: ['mind-maps', studyId],
    queryFn: async () => {
      const query = supabase
        .from('mind_maps')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (studyId) {
        query.eq('study_plan_id', studyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createCentralNode = () => {
    if (!centralTopic.trim()) {
      toast.error("Please enter a central topic");
      return;
    }

    const rootNode: MindMapNode = {
      id: 'root',
      label: centralTopic,
      parentId: null,
      level: 0
    };

    setNodes([rootNode]);
    setSelectedParentId('root');
    toast.success("Central node created!");
  };

  const addNode = () => {
    if (!newNodeLabel.trim()) {
      toast.error("Please enter a node label");
      return;
    }

    if (!selectedParentId) {
      toast.error("Please select a parent node");
      return;
    }

    const parent = nodes.find(n => n.id === selectedParentId);
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      label: newNodeLabel,
      parentId: selectedParentId,
      notes: newNodeNotes || undefined,
      level: parent ? parent.level + 1 : 1
    };

    setNodes([...nodes, newNode]);
    setNewNodeLabel('');
    setNewNodeNotes('');
    toast.success("Node added!");
  };

  const removeNode = (nodeId: string) => {
    if (nodeId === 'root') {
      toast.error("Cannot remove central node");
      return;
    }

    const removeNodeAndChildren = (id: string): string[] => {
      const childIds = nodes.filter(n => n.parentId === id).map(n => n.id);
      return [id, ...childIds.flatMap(removeNodeAndChildren)];
    };

    const idsToRemove = removeNodeAndChildren(nodeId);
    setNodes(nodes.filter(n => !idsToRemove.includes(n.id)));
    toast.success("Node removed");
  };

  const resetMap = () => {
    setNodes([]);
    setCentralTopic('');
    setSelectedParentId('');
    toast.success("Mind map reset");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const mindMapData = {
        centralTopic: nodes.find(n => n.id === 'root')?.label || centralTopic,
        nodes: nodes
      };

      const { error } = await supabase
        .from('mind_maps')
        .insert({
          user_id: user.id,
          study_plan_id: studyId || null,
          title: title || centralTopic,
          content: mindMapData,
          ai_generated: false,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps', studyId] });
      toast.success("Mind map saved!");
    },
    onError: () => {
      toast.error("Failed to save mind map");
    },
  });

  const handleDownloadJSON = () => {
    const mindMapData = {
      centralTopic: nodes.find(n => n.id === 'root')?.label || centralTopic,
      nodes: nodes
    };
    downloadJSON(mindMapData, `mind-map-${Date.now()}.json`);
  };

  const handleDownloadHTML = () => {
    const mindMapData = {
      centralTopic: nodes.find(n => n.id === 'root')?.label || centralTopic,
      nodes: nodes
    };
    const html = generateMindMapHTML(mindMapData);
    downloadHTML(html, `mind-map-${Date.now()}.html`);
  };

  const loadMap = (map: any) => {
    if (map.content?.nodes) {
      setNodes(map.content.nodes);
      setTitle(map.title);
      setCentralTopic(map.content.centralTopic || map.title);
      setSelectedParentId(map.content.nodes[0]?.id || '');
      toast.success("Mind map loaded!");
    }
  };

  const getNodesByParent = (parentId: string | null) => {
    return nodes.filter(n => n.parentId === parentId);
  };

  const renderNodeTree = (parentId: string | null, level: number = 0) => {
    const children = getNodesByParent(parentId);
    
    if (children.length === 0) return null;

    return children.map(node => {
      const hasChildren = getNodesByParent(node.id).length > 0;
      
      return (
        <div key={node.id} className="ml-6 mt-2">
          <div className="flex items-start gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{node.label}</span>
                {hasChildren && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {getNodesByParent(node.id).length}
                  </span>
                )}
              </div>
              {node.notes && (
                <p className="text-sm text-muted-foreground mt-1">{node.notes}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeNode(node.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {renderNodeTree(node.id, level + 1)}
        </div>
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Mind Mapping</h1>
            <p className="text-muted-foreground mt-2">
              Create hierarchical mind maps to organize your ideas
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Build Mind Map</CardTitle>
                <CardDescription>Start with a central topic, then add branches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Map Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., UX Research Ideas"
                  />
                </div>

                {nodes.length === 0 ? (
                  <div className="space-y-3">
                    <Label htmlFor="centralTopic">Central Topic *</Label>
                    <Input
                      id="centralTopic"
                      value={centralTopic}
                      onChange={(e) => setCentralTopic(e.target.value)}
                      placeholder="Main topic to explore"
                    />
                    <Button onClick={createCentralNode} className="w-full">
                      Create Central Node
                    </Button>
                  </div>
                ) : (
                  <>
                    <Separator />
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold">Add Branch/Node</h4>
                      
                      <div>
                        <Label htmlFor="nodeLabel">Node Label *</Label>
                        <Input
                          id="nodeLabel"
                          value={newNodeLabel}
                          onChange={(e) => setNewNodeLabel(e.target.value)}
                          placeholder="E.g., User Research, Prototyping"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="nodeNotes">Notes (optional)</Label>
                        <Textarea
                          id="nodeNotes"
                          value={newNodeNotes}
                          onChange={(e) => setNewNodeNotes(e.target.value)}
                          placeholder="Additional details"
                          rows={2}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="parentSelect">Connect to</Label>
                        <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {nodes.map(node => (
                              <SelectItem key={node.id} value={node.id}>
                                {'  '.repeat(node.level)}└ {node.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button onClick={addNode} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Node
                      </Button>
                    </div>

                    <Separator />

                    <Button onClick={resetMap} variant="outline" className="w-full">
                      Reset Map
                    </Button>
                  </>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || nodes.length === 0}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>

                <ExportDialog
                  data={{ centralTopic, nodes }}
                  title="Mind Map"
                  exportType="mind_map"
                  onDownloadJSON={handleDownloadJSON}
                  onDownloadHTML={handleDownloadHTML}
                  disabled={nodes.length === 0}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mind Map Structure</CardTitle>
                <CardDescription>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                {nodes.length > 0 ? (
                  <div className="space-y-2">
                    {nodes.filter(n => n.id === 'root').map(root => (
                      <div key={root.id}>
                        <div className="p-4 bg-primary/10 rounded-lg text-center">
                          <h3 className="text-xl font-bold">{root.label}</h3>
                          {root.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{root.notes}</p>
                          )}
                        </div>
                        {renderNodeTree('root')}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No nodes yet. Create a central node to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved Mind Maps</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading...</p>
                ) : mindMaps && mindMaps.length > 0 ? (
                  <div className="space-y-2">
                    {mindMaps.map((map) => (
                      <div 
                        key={map.id} 
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => loadMap(map)}
                      >
                        <p className="font-medium">{map.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(map.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No saved mind maps yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
