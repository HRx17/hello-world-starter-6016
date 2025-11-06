import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDialog } from "@/components/ExportDialog";
import { downloadJSON, downloadHTML, generateIAHTML } from "@/lib/exportHelpers";

interface IANode {
  id: string;
  label: string;
  parentId: string | null;
  description?: string;
  type?: string;
}

export default function InformationArchitecture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [nodes, setNodes] = useState<IANode[]>([
    { id: '1', label: 'Home', parentId: null, description: 'Main entry point', type: 'page' }
  ]);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeDescription, setNewNodeDescription] = useState("");
  const [newNodeType, setNewNodeType] = useState("page");
  const [selectedParentId, setSelectedParentId] = useState<string>('1');

  const { data: architectures, isLoading } = useQuery({
    queryKey: ['information-architectures', studyId],
    queryFn: async () => {
      const query = supabase
        .from('information_architectures')
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

  const addNode = () => {
    if (!newNodeLabel.trim()) {
      toast.error("Please enter a node label");
      return;
    }
    
    const newNode: IANode = {
      id: Date.now().toString(),
      label: newNodeLabel,
      parentId: selectedParentId,
      description: newNodeDescription || undefined,
      type: newNodeType
    };
    
    setNodes([...nodes, newNode]);
    setNewNodeLabel('');
    setNewNodeDescription('');
    toast.success("Node added!");
  };

  const removeNode = (nodeId: string) => {
    if (nodeId === '1') {
      toast.error("Cannot remove root node");
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

  const getNodeLevel = (nodeId: string): number => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.parentId) return 0;
    return 1 + getNodeLevel(node.parentId);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const iaStructure = {
        title: title || 'Untitled IA',
        nodes: nodes
      };

      const { error } = await supabase
        .from('information_architectures')
        .insert({
          user_id: user.id,
          study_plan_id: studyId || null,
          title: title || 'Untitled IA',
          structure: iaStructure,
          ai_generated: false,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-architectures', studyId] });
      toast.success("Information architecture saved!");
    },
    onError: () => {
      toast.error("Failed to save information architecture");
    },
  });

  const handleDownloadJSON = () => {
    const iaStructure = {
      title: title || 'Information Architecture',
      nodes: nodes
    };
    downloadJSON(iaStructure, `ia-${Date.now()}.json`);
  };

  const handleDownloadHTML = () => {
    const iaStructure = {
      title: title || 'Information Architecture',
      nodes: nodes
    };
    const html = generateIAHTML(iaStructure);
    downloadHTML(html, `ia-${Date.now()}.html`);
  };

  const loadIA = (ia: any) => {
    if (ia.structure?.nodes) {
      setNodes(ia.structure.nodes);
      setTitle(ia.structure.title || ia.title);
      toast.success("IA loaded!");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Information Architecture</h1>
            <p className="text-muted-foreground mt-2">
              Build your sitemap structure by adding pages and organizing hierarchically
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Build IA Structure</CardTitle>
                <CardDescription>Create a sitemap by adding pages and sections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., E-commerce Website IA"
                  />
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Add New Page/Section</h4>
                  
                  <div>
                    <Label htmlFor="nodeLabel">Page Name *</Label>
                    <Input
                      id="nodeLabel"
                      value={newNodeLabel}
                      onChange={(e) => setNewNodeLabel(e.target.value)}
                      placeholder="E.g., Products, About Us, Contact"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nodeType">Type</Label>
                    <Select value={newNodeType} onValueChange={setNewNodeType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="section">Section</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="nodeDescription">Description (optional)</Label>
                    <Input
                      id="nodeDescription"
                      value={newNodeDescription}
                      onChange={(e) => setNewNodeDescription(e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="parentSelect">Parent Page</Label>
                    <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {nodes.map(node => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={addNode}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Page
                  </Button>
                </div>

                <div className="border-t pt-4 flex gap-2">
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
                  data={{ title, nodes }}
                  title="Information Architecture"
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
                <CardTitle>IA Structure</CardTitle>
                <CardDescription>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {nodes.map((node) => {
                    const parent = nodes.find(n => n.id === node.parentId);
                    const children = nodes.filter(n => n.parentId === node.id);
                    const level = getNodeLevel(node.id);
                    
                    return (
                      <div 
                        key={node.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        style={{ marginLeft: `${level * 16}px` }}
                      >
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{node.label}</span>
                            {node.type && (
                              <Badge variant="outline" className="text-xs">
                                {node.type}
                              </Badge>
                            )}
                            {children.length > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {children.length}
                              </span>
                            )}
                          </div>
                          {node.description && (
                            <p className="text-sm text-muted-foreground mt-1">{node.description}</p>
                          )}
                          {parent && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Under: {parent.label}
                            </p>
                          )}
                        </div>
                        {node.id !== '1' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeNode(node.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved IAs</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading...</p>
                ) : architectures && architectures.length > 0 ? (
                  <div className="space-y-2">
                    {architectures.map((ia) => (
                      <div 
                        key={ia.id} 
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => loadIA(ia)}
                      >
                        <p className="font-medium">{ia.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(ia.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No saved IAs yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
