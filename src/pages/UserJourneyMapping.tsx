import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Download, Share2, Smile, Meh, Frown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function UserJourneyMapping() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [scenario, setScenario] = useState("");
  const [generatedJourney, setGeneratedJourney] = useState<any>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [figmaToken, setFigmaToken] = useState("");

  const { data: journeys, isLoading } = useQuery({
    queryKey: ['user-journey-maps', studyId],
    queryFn: async () => {
      const query = supabase
        .from('user_journey_maps')
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

  const { data: personas } = useQuery({
    queryKey: ['personas', studyId],
    queryFn: async () => {
      const query = supabase
        .from('personas')
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
      const selectedPersona = personas?.find(p => p.id === selectedPersonaId);
      
      const { data, error } = await supabase.functions.invoke('generate-user-journey-map', {
        body: { 
          persona: selectedPersona,
          scenario,
          studyData: study ? { title: study.title, problem: study.problem_statement } : null
        }
      });

      if (error) throw error;
      return data.userJourneyMap;
    },
    onSuccess: (data) => {
      setGeneratedJourney(data);
      toast.success("User journey map generated!");
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limits exceeded')) {
        toast.error("Rate limits exceeded, please try again later.");
      } else if (error.message?.includes('Payment required')) {
        toast.error("Payment required, please add funds to your workspace.");
      } else {
        toast.error("Failed to generate user journey map");
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_journey_maps')
        .insert({
          user_id: user.id,
          study_plan_id: studyId,
          persona_id: selectedPersonaId || null,
          title: title || generatedJourney.title,
          journey_data: generatedJourney,
          ai_generated: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-journey-maps', studyId] });
      toast.success("User journey map saved!");
      setTitle("");
      setSelectedPersonaId("");
      setScenario("");
      setGeneratedJourney(null);
    },
    onError: () => {
      toast.error("Failed to save user journey map");
    },
  });

  const exportToFigmaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('export-to-figma', {
        body: {
          exportType: 'user_journey_map',
          data: generatedJourney,
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
    const dataStr = JSON.stringify(generatedJourney, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `user-journey-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getEmotionIcon = (level: number) => {
    if (level >= 4) return <Smile className="h-5 w-5 text-green-500" />;
    if (level >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Frown className="h-5 w-5 text-red-500" />;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">User Journey Mapping</h1>
            <p className="text-muted-foreground mt-2">
              Map user experiences with AI-powered journey mapping
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Journey Map</CardTitle>
                <CardDescription>Use AI to create a detailed user journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Journey map title"
                  />
                </div>
                <div>
                  <Label htmlFor="persona">Persona (Optional)</Label>
                  <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No persona</SelectItem>
                      {personas?.map((persona) => (
                        <SelectItem key={persona.id} value={persona.id}>
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scenario">Scenario</Label>
                  <Textarea
                    id="scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    placeholder="Describe the user's scenario or goal"
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={() => generateMutation.mutate()}
                  disabled={!scenario || generateMutation.isPending}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate Journey Map'}
                </Button>
              </CardContent>
            </Card>

            {generatedJourney && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button onClick={() => saveMutation.mutate()} className="w-full">
                    Save Journey Map
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
            {generatedJourney && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Journey Map</CardTitle>
                  {generatedJourney.title && (
                    <CardDescription>{generatedJourney.title}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedJourney.stages?.map((stage: any, index: number) => (
                    <div key={stage.id || index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg">{stage.name}</h4>
                        {stage.emotionLevel && getEmotionIcon(stage.emotionLevel)}
                      </div>
                      
                      {stage.actions && stage.actions.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">Actions:</p>
                          <ul className="text-sm list-disc list-inside">
                            {stage.actions.map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {stage.touchpoints && stage.touchpoints.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">Touchpoints:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stage.touchpoints.map((tp: string, i: number) => (
                              <Badge key={i} variant="outline">{tp}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.painPoints && stage.painPoints.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-destructive">Pain Points:</p>
                          <ul className="text-sm list-disc list-inside text-muted-foreground">
                            {stage.painPoints.map((pain: string, i: number) => (
                              <li key={i}>{pain}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {stage.opportunities && stage.opportunities.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-green-600">Opportunities:</p>
                          <ul className="text-sm list-disc list-inside text-muted-foreground">
                            {stage.opportunities.map((opp: string, i: number) => (
                              <li key={i}>{opp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Saved Journey Maps</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading...</p>
                ) : journeys && journeys.length > 0 ? (
                  <div className="space-y-2">
                    {journeys.map((journey) => (
                      <div key={journey.id} className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                        <p className="font-medium">{journey.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(journey.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No saved journey maps yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}