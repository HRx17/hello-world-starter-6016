import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar, Users, Lightbulb, UserCircle, Edit, Sparkles, CheckCircle2, Circle, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function StudyPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: study, isLoading } = useQuery({
    queryKey: ['study-plan', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: interviews } = useQuery({
    queryKey: ['study-interviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('study_plan_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: observations } = useQuery({
    queryKey: ['study-observations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .eq('study_plan_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: personas } = useQuery({
    queryKey: ['study-personas', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('study_plan_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          study_plan_id: id,
          participant_name: participantName,
          scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : null,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-interviews', id] });
      toast.success("Interview session created!");
      setNewInterviewOpen(false);
      setParticipantName("");
      setScheduledDate("");
      navigate(`/research/interview/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to create interview session");
    },
  });

  const generateAISuggestionsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: { 
          problemStatement: study?.problem_statement, 
          solutionGoal: study?.solution_goal 
        }
      });

      if (error) throw error;
      
      const { error: updateError } = await supabase
        .from('study_plans')
        .update({ ai_suggestions: { suggestions: data.studyPlan } })
        .eq('id', id);

      if (updateError) throw updateError;
      return data.studyPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', id] });
      toast.success("AI study plan generated!");
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limits exceeded')) {
        toast.error("Rate limits exceeded, please try again later.");
      } else if (error.message?.includes('Payment required')) {
        toast.error("Payment required, please add funds to your workspace.");
      } else {
        toast.error("Failed to generate AI suggestions");
      }
    },
  });

  const convertToStepsMutation = useMutation({
    mutationFn: async () => {
      const aiText = typeof study?.ai_suggestions === 'object' && study?.ai_suggestions && 'suggestions' in study.ai_suggestions 
        ? String(study.ai_suggestions.suggestions)
        : JSON.stringify(study?.ai_suggestions);

      const { data, error } = await supabase.functions.invoke('parse-ai-to-steps', {
        body: { aiSuggestions: aiText }
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('study_plans')
        .update({ plan_steps: data.steps })
        .eq('id', id);

      if (updateError) throw updateError;
      return data.steps;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', id] });
      toast.success("Plan converted to actionable steps!");
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limits exceeded')) {
        toast.error("Rate limits exceeded, please try again later.");
      } else if (error.message?.includes('Payment required')) {
        toast.error("Payment required, please add funds to your workspace.");
      } else {
        toast.error("Failed to convert to steps");
      }
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, completed }: { stepId: string; completed: boolean }) => {
      const currentSteps = (study?.plan_steps as any[]) || [];
      const updatedSteps = currentSteps.map(step => 
        step.id === stepId ? { ...step, completed } : step
      );

      const { error } = await supabase
        .from('study_plans')
        .update({ plan_steps: updatedSteps })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', id] });
    },
    onError: () => {
      toast.error("Failed to update step");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Loading study plan...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!study) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Study plan not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">{study.title}</h1>
              <Badge>{study.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Created {format(new Date(study.created_at), 'PPP')}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plan">
              <ListTodo className="mr-2 h-4 w-4" />
              Action Plan ({((study.plan_steps as any[]) || []).length} steps)
            </TabsTrigger>
            <TabsTrigger value="interviews">
              <Users className="mr-2 h-4 w-4" />
              Interviews ({interviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="observations">
              <Lightbulb className="mr-2 h-4 w-4" />
              Observations ({observations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="personas">
              <UserCircle className="mr-2 h-4 w-4" />
              Personas ({personas?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Problem Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{study.problem_statement}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solution Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{study.solution_goal}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>AI-Generated Study Plan</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateAISuggestionsMutation.mutate()}
                      disabled={generateAISuggestionsMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {study.ai_suggestions ? "Regenerate Plan" : "Generate Plan"}
                    </Button>
                    {study.ai_suggestions && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => convertToStepsMutation.mutate()}
                        disabled={convertToStepsMutation.isPending}
                      >
                        <ListTodo className="mr-2 h-4 w-4" />
                        Convert to Steps
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {generateAISuggestionsMutation.isPending ? (
                  <p className="text-muted-foreground">Generating AI suggestions...</p>
                ) : study.ai_suggestions ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {typeof study.ai_suggestions === 'object' && study.ai_suggestions && 'suggestions' in study.ai_suggestions 
                      ? String(study.ai_suggestions.suggestions)
                      : JSON.stringify(study.ai_suggestions, null, 2)
                    }
                  </div>
                ) : (
                  <p className="text-muted-foreground">No AI suggestions yet. Click "Generate Plan" to create one.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plan" className="space-y-6">
            {((study.plan_steps as any[]) || []).length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Action Plan Yet</CardTitle>
                  <CardDescription>
                    Generate AI suggestions first, then convert them to actionable steps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate(`/research/study/${id}?tab=overview`)}>
                    Go to Overview to Generate Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Actionable Steps for Study</h2>
                    <p className="text-muted-foreground mt-1">
                      Track your progress and link steps to actual research activities
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary">
                      {((study.plan_steps as any[]) || []).filter((s: any) => s.completed).length} / {((study.plan_steps as any[]) || []).length} Completed
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4">
                  {((study.plan_steps as any[]) || [])
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((step) => {
                      const isInterviewStep = step.title.toLowerCase().includes('interview');
                      const isObservationStep = step.title.toLowerCase().includes('observation') || 
                                              step.title.toLowerCase().includes('field') ||
                                              step.title.toLowerCase().includes('diary');
                      const isPersonaStep = step.title.toLowerCase().includes('persona');
                      const isAnalysisStep = step.title.toLowerCase().includes('analysis') || 
                                           step.title.toLowerCase().includes('synthesis');

                      return (
                        <Card 
                          key={step.id}
                          className={`transition-all cursor-pointer hover:shadow-md hover:border-primary/50 ${step.completed ? 'opacity-60' : ''}`}
                          onClick={() => navigate(`/research/study/${id}/step/${step.id}`)}
                        >
                          <CardHeader>
                            <div className="flex items-start gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStepMutation.mutate({ 
                                    stepId: step.id, 
                                    completed: !step.completed 
                                  });
                                }}
                                className="mt-1 flex-shrink-0"
                              >
                                {step.completed ? (
                                  <CheckCircle2 className="h-6 w-6 text-primary" />
                                ) : (
                                  <Circle className="h-6 w-6 text-muted-foreground" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    Step {step.order}
                                  </Badge>
                                  {isInterviewStep && (
                                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                      <Users className="h-3 w-3 mr-1" />
                                      Interview
                                    </Badge>
                                  )}
                                  {isObservationStep && (
                                    <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                      <Lightbulb className="h-3 w-3 mr-1" />
                                      Observation
                                    </Badge>
                                  )}
                                  {isPersonaStep && (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                      <UserCircle className="h-3 w-3 mr-1" />
                                      Persona
                                    </Badge>
                                  )}
                                  {isAnalysisStep && (
                                    <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                      Analysis
                                    </Badge>
                                  )}
                                </div>
                                <h4 className={`font-semibold text-lg ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {step.title}
                                </h4>
                                {step.description && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {step.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">
                              Click to open workspace with AI guidance and tools →
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </>
            )}
          </TabsContent>


          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Interview Sessions</h2>
                <p className="text-muted-foreground mt-1">
                  Plan, schedule, and conduct user interviews
                </p>
              </div>
              <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Interview
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule New Interview</DialogTitle>
                    <DialogDescription>Add a participant and schedule an interview session</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="participant">Participant Name *</Label>
                      <Input
                        id="participant"
                        placeholder="John Doe"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Scheduled Date</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={() => createInterviewMutation.mutate()} 
                      disabled={!participantName || createInterviewMutation.isPending}
                      className="w-full"
                    >
                      {createInterviewMutation.isPending ? "Creating..." : "Create Interview"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>


            {interviews && interviews.length > 0 ? (
              <div className="grid gap-4">
                {interviews.map((interview) => (
                  <Card 
                    key={interview.id} 
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                    onClick={() => navigate(`/research/interview/${interview.id}`)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {interview.participant_name}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {interview.scheduled_at 
                              ? `Scheduled: ${format(new Date(interview.scheduled_at), 'PPP p')}`
                              : 'Not scheduled yet'
                            }
                          </CardDescription>
                        </div>
                        <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                          {interview.status}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardHeader className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>No interviews scheduled</CardTitle>
                  <CardDescription className="mt-2">
                    Schedule your first interview to begin gathering user insights
                  </CardDescription>
                  <Button 
                    className="mt-4 mx-auto"
                    onClick={() => setNewInterviewOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule First Interview
                  </Button>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="observations" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Research Observations</h2>
                <p className="text-muted-foreground mt-1">
                  Capture insights, pain points, and behaviors from your research
                </p>
              </div>
              <Button onClick={() => navigate(`/research/study/${id}/observations`)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
              </Button>
            </div>

            {observations && observations.length > 0 ? (
              <div className="grid gap-4">
                {observations.map((obs) => (
                  <Card key={obs.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Badge className="mb-2">{obs.observation_type}</Badge>
                          <p className="text-sm">{obs.content}</p>
                          {obs.tags && obs.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {obs.tags.map((tag, i) => (
                                <Badge key={i} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(obs.created_at), 'PPp')}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardHeader className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Lightbulb className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>No observations yet</CardTitle>
                  <CardDescription className="mt-2">
                    Record observations from your research sessions, interviews, and field studies
                  </CardDescription>
                  <Button 
                    className="mt-4 mx-auto"
                    onClick={() => navigate(`/research/study/${id}/observations`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Observation
                  </Button>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="personas" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">User Personas</h2>
                <p className="text-muted-foreground mt-1">
                  Build personas based on your research findings
                </p>
              </div>
              <Button onClick={() => navigate(`/research/study/${id}/persona/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Persona
              </Button>
            </div>

            {personas && personas.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {personas.map((persona) => (
                  <Card 
                    key={persona.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/research/persona/${persona.id}`)}
                  >
                    <CardHeader>
                      <CardTitle>{persona.name}</CardTitle>
                      <CardDescription>{persona.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {persona.goals && persona.goals.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Goals:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {persona.goals.slice(0, 3).map((goal, i) => (
                              <li key={i}>{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardHeader className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>No personas created</CardTitle>
                  <CardDescription className="mt-2">
                    Create user personas based on insights from your research
                  </CardDescription>
                  <Button 
                    className="mt-4 mx-auto"
                    onClick={() => navigate(`/research/study/${id}/persona/new`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Persona
                  </Button>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}