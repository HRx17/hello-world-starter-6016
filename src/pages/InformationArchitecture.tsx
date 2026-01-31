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
import { ArrowLeft, Save, Edit2 } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { downloadJSON, downloadHTML, generateIAHTML } from "@/lib/exportHelpers";
import { SitemapCanvas } from "@/components/sitemap/SitemapCanvas";
import { SitemapNode } from "@/components/sitemap/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InformationArchitecture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [nodes, setNodes] = useState<SitemapNode[]>([
    { id: '1', label: 'Home', parentId: null, description: 'Main entry point', type: 'page', position: { x: 100, y: 200 } }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

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

  const updateNode = (nodeId: string, updates: Partial<SitemapNode>) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert to legacy format for storage
      const legacyNodes = nodes.map(n => ({
        id: n.id,
        label: n.label,
        parentId: n.parentId,
        description: n.description,
        type: n.type,
      }));

      const iaStructure = {
        title: title || 'Untitled IA',
        nodes: legacyNodes,
        canvasNodes: nodes, // Store full canvas data
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
    const legacyNodes = nodes.map(n => ({
      id: n.id,
      label: n.label,
      parentId: n.parentId,
      description: n.description,
      type: n.type,
    }));
    const iaStructure = {
      title: title || 'Information Architecture',
      nodes: legacyNodes
    };
    const html = generateIAHTML(iaStructure);
    downloadHTML(html, `ia-${Date.now()}.html`);
  };

  const loadIA = (ia: any) => {
    if (ia.structure?.canvasNodes) {
      // Load canvas format
      setNodes(ia.structure.canvasNodes);
    } else if (ia.structure?.nodes) {
      // Convert legacy format to canvas format
      const legacyNodes = ia.structure.nodes;
      const canvasNodes: SitemapNode[] = legacyNodes.map((n: any, index: number) => ({
        ...n,
        type: n.type || 'page',
        position: { x: 100 + (index % 4) * 220, y: 100 + Math.floor(index / 4) * 120 }
      }));
      setNodes(canvasNodes);
    }
    setTitle(ia.structure?.title || ia.title);
    toast.success("IA loaded!");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Information Architecture</h1>
              <p className="text-sm text-muted-foreground">
                Build your sitemap visually with drag and drop
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title..."
              className="w-48"
            />
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || nodes.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <ExportDialog
              data={{ title, nodes }}
              title="Information Architecture"
              exportType="information_architecture"
              onDownloadJSON={handleDownloadJSON}
              onDownloadHTML={handleDownloadHTML}
              disabled={nodes.length === 0}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 p-4">
            <SitemapCanvas
              nodes={nodes}
              onNodesChange={setNodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </div>

          {/* Sidebar - Saved IAs */}
          <div className="w-64 border-l bg-background p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3">Saved IAs</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : architectures && architectures.length > 0 ? (
              <div className="space-y-2">
                {architectures.map((ia) => (
                  <div 
                    key={ia.id} 
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => loadIA(ia)}
                  >
                    <p className="font-medium text-sm truncate">{ia.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ia.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No saved IAs yet</p>
            )}
          </div>
        </div>

        {/* Node Edit Sheet */}
        <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNodeId(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Node
              </SheetTitle>
              <SheetDescription>
                Update the details for this page/section
              </SheetDescription>
            </SheetHeader>
            
            {selectedNode && (
              <div className="space-y-4 mt-6">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={selectedNode.label}
                    onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                    placeholder="Page name"
                  />
                </div>
                
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={selectedNode.type} 
                    onValueChange={(v) => updateNode(selectedNode.id, { type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">📄 Page</SelectItem>
                      <SelectItem value="section">📁 Section</SelectItem>
                      <SelectItem value="category">🏷️ Category</SelectItem>
                      <SelectItem value="feature">⚡ Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={selectedNode.description || ''}
                    onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                    placeholder="Brief description of this page..."
                    rows={3}
                  />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Parent:</strong> {nodes.find(n => n.id === selectedNode.parentId)?.label || 'None (Root)'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Children:</strong> {nodes.filter(n => n.parentId === selectedNode.id).length}
                  </p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
