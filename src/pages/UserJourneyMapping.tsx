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
import { ArrowLeft, Plus, Trash2, Save, Download, Smile, Meh, Frown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FigmaExportDialog } from "@/components/FigmaExportDialog";

interface JourneyStage {
  id: string;
  name: string;
  actions: string[];
  touchpoints: string[];
  thoughts: string[];
  painPoints: string[];
  opportunities: string[];
  emotionLevel: number;
}

export default function UserJourneyMapping() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [stages, setStages] = useState<JourneyStage[]>([]);
  
  const [newStageName, setNewStageName] = useState("");
  const [currentStageId, setCurrentStageId] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newTouchpoint, setNewTouchpoint] = useState("");
  const [newThought, setNewThought] = useState("");
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newOpportunity, setNewOpportunity] = useState("");

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

  const addStage = () => {
    if (!newStageName.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    const newStage: JourneyStage = {
      id: Date.now().toString(),
      name: newStageName,
      actions: [],
      touchpoints: [],
      thoughts: [],
      painPoints: [],
      opportunities: [],
      emotionLevel: 3
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setCurrentStageId(newStage.id);
    toast.success("Stage added!");
  };

  const removeStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId));
    if (currentStageId === stageId) {
      setCurrentStageId(stages[0]?.id || '');
    }
    toast.success("Stage removed");
  };

  const addToStage = (field: keyof JourneyStage, value: string) => {
    if (!currentStageId || !value.trim()) return;

    setStages(stages.map(stage => {
      if (stage.id === currentStageId) {
        const fieldValue = stage[field];
        if (Array.isArray(fieldValue)) {
          return { ...stage, [field]: [...fieldValue, value] };
        }
      }
      return stage;
    }));
    toast.success("Added!");
  };

  const removeFromStage = (stageId: string, field: keyof JourneyStage, index: number) => {
    setStages(stages.map(stage => {
      if (stage.id === stageId) {
        const fieldValue = stage[field];
        if (Array.isArray(fieldValue)) {
          return { ...stage, [field]: fieldValue.filter((_, i) => i !== index) };
        }
      }
      return stage;
    }));
  };

  const updateEmotion = (stageId: string, level: number) => {
    setStages(stages.map(stage => 
      stage.id === stageId ? { ...stage, emotionLevel: level } : stage
    ));
  };

  const getEmotionIcon = (level: number) => {
    if (level >= 4) return <Smile className="h-5 w-5 text-green-500" />;
    if (level >= 3) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Frown className="h-5 w-5 text-red-500" />;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const journeyData = {
        title: title || 'User Journey Map',
        persona: selectedPersonaId,
        stages: stages
      };

      const { error } = await supabase
        .from('user_journey_maps')
        .insert({
          user_id: user.id,
          study_plan_id: studyId || null,
          persona_id: selectedPersonaId || null,
          title: title || 'User Journey Map',
          journey_data: journeyData,
          ai_generated: false,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-journey-maps', studyId] });
      toast.success("Journey map saved!");
    },
    onError: () => {
      toast.error("Failed to save journey map");
    },
  });

  const exportToFigmaMutation = useMutation({
    mutationFn: async (token: string) => {
      const journeyData = {
        title: title || 'User Journey Map',
        stages: stages
      };

      const { data, error } = await supabase.functions.invoke('export-to-figma', {
        body: {
          exportType: 'user_journey_map',
          data: journeyData,
          figmaAccessToken: token,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Exported to Figma!");
      if (data.figmaFileUrl) {
        window.open(data.figmaFileUrl, '_blank');
      }
    },
    onError: () => {
      toast.error("Failed to export to Figma");
    },
  });

  const downloadAsJSON = () => {
    const journeyData = {
      title: title || 'User Journey Map',
      stages: stages
    };
    
    const dataStr = JSON.stringify(journeyData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `user-journey-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const loadJourney = (journey: any) => {
    if (journey.journey_data?.stages) {
      setStages(journey.journey_data.stages);
      setTitle(journey.journey_data.title || journey.title);
      setSelectedPersonaId(journey.persona_id || '');
      setCurrentStageId(journey.journey_data.stages[0]?.id || '');
      toast.success("Journey loaded!");
    }
  };

  const currentStage = stages.find(s => s.id === currentStageId);

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
              Map user experiences through each stage of their journey
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Journey Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Journey Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g., Online Shopping Journey"
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

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Add Journey Stage</h4>
                  <div className="flex gap-2">
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="E.g., Awareness, Research, Purchase"
                    />
                    <Button onClick={addStage}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {stages.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Select Stage to Edit</Label>
                      <Select value={currentStageId} onValueChange={setCurrentStageId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {currentStage && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold">Edit: {currentStage.name}</h4>
                      
                      <div>
                        <Label>Emotion Level</Label>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map(level => (
                            <Button
                              key={level}
                              size="sm"
                              variant={currentStage.emotionLevel === level ? "default" : "outline"}
                              onClick={() => updateEmotion(currentStage.id, level)}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Add Action</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newAction}
                            onChange={(e) => setNewAction(e.target.value)}
                            placeholder="What does the user do?"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              addToStage('actions', newAction);
                              setNewAction('');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Add Touchpoint</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newTouchpoint}
                            onChange={(e) => setNewTouchpoint(e.target.value)}
                            placeholder="Where do they interact? (website, app, store)"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              addToStage('touchpoints', newTouchpoint);
                              setNewTouchpoint('');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Add Thought</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newThought}
                            onChange={(e) => setNewThought(e.target.value)}
                            placeholder="What are they thinking?"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              addToStage('thoughts', newThought);
                              setNewThought('');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Add Pain Point</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newPainPoint}
                            onChange={(e) => setNewPainPoint(e.target.value)}
                            placeholder="What problems do they encounter?"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              addToStage('painPoints', newPainPoint);
                              setNewPainPoint('');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Add Opportunity</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newOpportunity}
                            onChange={(e) => setNewOpportunity(e.target.value)}
                            placeholder="How can we improve this?"
                          />
                          <Button 
                            size="sm"
                            onClick={() => {
                              addToStage('opportunities', newOpportunity);
                              setNewOpportunity('');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || stages.length === 0}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={downloadAsJSON}
                    disabled={stages.length === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                <FigmaExportDialog
                  onExport={(token) => exportToFigmaMutation.mutateAsync(token)}
                  isExporting={exportToFigmaMutation.isPending}
                  disabled={stages.length === 0}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Journey Map</CardTitle>
                <CardDescription>{stages.length} stage{stages.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stages.map((stage, index) => (
                    <div key={stage.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{index + 1}</Badge>
                          <h4 className="font-bold">{stage.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {getEmotionIcon(stage.emotionLevel)}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStage(stage.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {stage.actions.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">Actions:</p>
                          <div className="space-y-1">
                            {stage.actions.map((action, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-accent/50 p-2 rounded">
                                <span>• {action}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromStage(stage.id, 'actions', i)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.touchpoints.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">Touchpoints:</p>
                          <div className="flex flex-wrap gap-1">
                            {stage.touchpoints.map((tp, i) => (
                              <Badge 
                                key={i} 
                                variant="outline"
                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeFromStage(stage.id, 'touchpoints', i)}
                              >
                                {tp} ×
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.thoughts.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold">Thoughts:</p>
                          <div className="space-y-1">
                            {stage.thoughts.map((thought, i) => (
                              <div key={i} className="flex items-center justify-between text-sm italic text-muted-foreground bg-accent/30 p-2 rounded">
                                <span>"{thought}"</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromStage(stage.id, 'thoughts', i)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.painPoints.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-destructive">Pain Points:</p>
                          <div className="space-y-1">
                            {stage.painPoints.map((pain, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-destructive/10 p-2 rounded">
                                <span>⚠️ {pain}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromStage(stage.id, 'painPoints', i)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stage.opportunities.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-green-600">Opportunities:</p>
                          <div className="space-y-1">
                            {stage.opportunities.map((opp, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-green-500/10 p-2 rounded">
                                <span>💡 {opp}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeFromStage(stage.id, 'opportunities', i)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {stages.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No stages yet. Add a stage to get started.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                      <div 
                        key={journey.id} 
                        className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => loadJourney(journey)}
                      >
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
