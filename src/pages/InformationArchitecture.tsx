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
import { ArrowLeft, Sparkles, Download, Share2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function InformationArchitecture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [userNeeds, setUserNeeds] = useState("");
  const [generatedIA, setGeneratedIA] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [figmaToken, setFigmaToken] = useState("");

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
      const { data, error } = await supabase.functions.invoke('generate-information-architecture', {
        body: { 
          projectName,
          description,
          userNeeds,
          studyData: study ? { title: study.title, problem: study.problem_statement } : null
        }
      });

      if (error) throw error;
      return data.informationArchitecture;
    },
    onSuccess: (data) => {
      setGeneratedIA(data);
      toast.success("Information architecture generated!");
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limits exceeded')) {
        toast.error("Rate limits exceeded, please try again later.");
      } else if (error.message?.includes('Payment required')) {
        toast.error("Payment required, please add funds to your workspace.");
      } else {
        toast.error("Failed to generate information architecture");
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('information_architectures')
        .insert({
          user_id: user.id,
          study_plan_id: studyId,
          title: title || projectName,
          structure: generatedIA,
          ai_generated: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['information-architectures', studyId] });
      toast.success("Information architecture saved!");
      setTitle("");
      setProjectName("");
      setDescription("");
      setUserNeeds("");
      setGeneratedIA(null);
    },
    onError: () => {
      toast.error("Failed to save information architecture");
    },
  });

  const exportToFigmaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-to-figma', {
        body: {
          exportType: 'information_architecture',
          data: generatedIA,
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
    const dataStr = JSON.stringify(generatedIA, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `information-architecture-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const renderHierarchy = (items: any[], level = 0) => {
    return items?.map((item) => (
      <div key={item.id} style={{ marginLeft: `${level * 24}px` }} className="my-2">
        <div className="flex items-center gap-2 p-2 border rounded hover:bg-accent">
          <ChevronRight className="h-4 w-4" />
          <div className="flex-1">
            <p className="font-medium">{item.label}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            {item.type && (
              <Badge variant="outline" className="mt-1">{item.type}</Badge>
            )}
          </div>
        </div>
        {item.children && renderHierarchy(item.children, level + 1)}
      </div>
    ));
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
              Design and organize your content structure with AI
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate IA</CardTitle>
                <CardDescription>Use AI to create a structured information architecture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="IA title"
                  />
                </div>
                <div>
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Your product or service name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this product/service do?"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="userNeeds">User Needs</Label>
                  <Textarea
                    id="userNeeds"
                    value={userNeeds}
                    onChange={(e) => setUserNeeds(e.target.value)}
                    placeholder="What are users trying to accomplish?"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={() => generateMutation.mutate()}
                  disabled={!projectName || generateMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate IA'}
                </Button>
              </CardContent>
            </Card>

            {generatedIA && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => saveMutation.mutate()} className="w-full">
                    Save Information Architecture
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
            {generatedIA && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated IA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedIA.title && (
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <h3 className="text-xl font-bold">{generatedIA.title}</h3>
                    </div>
                  )}
                  
                  {generatedIA.hierarchy && (
                    <div>
                      <h4 className="font-semibold mb-2">Site Hierarchy</h4>
                      {renderHierarchy(generatedIA.hierarchy)}
                    </div>
                  )}

                  {generatedIA.navigation && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Navigation</h4>
                      {generatedIA.navigation.primary && (
                        <div>
                          <p className="text-sm font-medium">Primary:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedIA.navigation.primary.map((nav: string) => (
                              <Badge key={nav}>{nav}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {generatedIA.navigation.secondary && (
                        <div>
                          <p className="text-sm font-medium">Secondary:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedIA.navigation.secondary.map((nav: string) => (
                              <Badge key={nav} variant="outline">{nav}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                      <div key={ia.id} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
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