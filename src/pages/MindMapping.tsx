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
import { ArrowLeft, Sparkles, Download, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function MindMapping() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [generatedMindMap, setGeneratedMindMap] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [figmaToken, setFigmaToken] = useState("");

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

  const { data: study } = useQuery({
    queryKey: ['study-plan', studyId],
    queryFn: async () => {
      if (!studyId) return null;
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', studyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!studyId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-mind-map', {
        body: { 
          topic,
          context,
          studyData: study ? { title: study.title, problem: study.problem_statement } : null
        }
      });

      if (error) throw error;
      return data.mindMap;
    },
    onSuccess: (data) => {
      setGeneratedMindMap(data);
      toast.success("Mind map generated!");
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limits exceeded')) {
        toast.error("Rate limits exceeded, please try again later.");
      } else if (error.message?.includes('Payment required')) {
        toast.error("Payment required, please add funds to your workspace.");
      } else {
        toast.error("Failed to generate mind map");
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('mind_maps')
        .insert({
          user_id: user.id,
          study_plan_id: studyId,
          title: title || topic,
          content: generatedMindMap,
          ai_generated: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mind-maps', studyId] });
      toast.success("Mind map saved!");
      setTitle("");
      setTopic("");
      setContext("");
      setGeneratedMindMap(null);
    },
    onError: () => {
      toast.error("Failed to save mind map");
    },
  });

  const exportToFigmaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-to-figma', {
        body: {
          exportType: 'mind_map',
          data: generatedMindMap,
          figmaAccessToken: figmaToken,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Exported to Figma!");
      window.open(data.figmaFileUrl, '_blank');
      setShowExportDialog(false);
    },
    onError: () => {
      toast.error("Failed to export to Figma");
    },
  });

  const downloadAsJSON = () => {
    const dataStr = JSON.stringify(generatedMindMap, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `mind-map-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
              Create AI-powered mind maps to visualize your research
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Mind Map</CardTitle>
                <CardDescription>Use AI to create a structured mind map</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mind map title"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Central Topic</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Main topic to explore"
                  />
                </div>
                <div>
                  <Label htmlFor="context">Context</Label>
                  <Textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Additional context or requirements"
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={() => generateMutation.mutate()}
                  disabled={!topic || generateMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate Mind Map'}
                </Button>
              </CardContent>
            </Card>

            {generatedMindMap && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => saveMutation.mutate()} className="w-full">
                    Save Mind Map
                  </Button>
                  <Button onClick={downloadAsJSON} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download as JSON
                  </Button>
                  <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Share2 className="mr-2 h-4 w-4" />
                        Export to Figma
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Export to Figma</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="figma-token">Figma Access Token</Label>
                          <Input
                            id="figma-token"
                            type="password"
                            value={figmaToken}
                            onChange={(e) => setFigmaToken(e.target.value)}
                            placeholder="Enter your Figma access token"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Get your token from Figma Settings → Personal Access Tokens
                          </p>
                        </div>
                        <Button 
                          onClick={() => exportToFigmaMutation.mutate()}
                          disabled={!figmaToken || exportToFigmaMutation.isPending}
                          className="w-full"
                        >
                          {exportToFigmaMutation.isPending ? 'Exporting...' : 'Export'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {generatedMindMap && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Mind Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedMindMap.centralTopic && (
                      <div className="text-center p-4 bg-primary/10 rounded-lg">
                        <h3 className="text-xl font-bold">{generatedMindMap.centralTopic}</h3>
                      </div>
                    )}
                    {generatedMindMap.branches?.map((branch: any) => (
                      <div key={branch.id} className="border-l-4 pl-4" style={{ borderColor: branch.color }}>
                        <h4 className="font-semibold">{branch.label}</h4>
                        {branch.children?.map((child: any) => (
                          <div key={child.id} className="ml-4 mt-2 text-sm">
                            <p>• {child.label}</p>
                            {child.notes && <p className="text-muted-foreground ml-4">{child.notes}</p>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <div key={map.id} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
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