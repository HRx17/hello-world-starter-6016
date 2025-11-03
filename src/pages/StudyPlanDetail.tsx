import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar, Users, Lightbulb, UserCircle, Edit, Sparkles, CheckCircle2, Circle, ListTodo, ChevronDown, ChevronUp, Pencil, Trash2, Archive } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function StudyPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [aiPlanExpanded, setAiPlanExpanded] = useState(false);
  
  // Edit study state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editProblem, setEditProblem] = useState("");
  const [editSolution, setEditSolution] = useState("");
  const [editStatus, setEditStatus] = useState("");

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

  // Edit study plan mutation
  const editStudyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('study_plans')
        .update({
          title: editTitle,
          problem_statement: editProblem,
          solution_goal: editSolution,
          status: editStatus,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', id] });
      toast.success("Study plan updated");
      setShowEditDialog(false);
    },
  });

  // Delete study plan mutation
  const deleteStudyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Study plan deleted");
      navigate("/research");
    },
  });

  // Archive study plan mutation
  const archiveStudyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('study_plans')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', id] });
      toast.success("Study plan archived");
    },
  });

  // Delete interview mutation
  const deleteInterviewMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', interviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-interviews', id] });
      toast.success("Interview deleted");
    },
  });

  // Delete observation mutation
  const deleteObservationMutation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from('research_observations')
        .delete()
        .eq('id', observationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-observations', id] });
      toast.success("Observation deleted");
    },
  });

  // Delete persona mutation
  const deletePersonaMutation = useMutation({
    mutationFn: async (personaId: string) => {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', personaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-personas', id] });
      toast.success("Persona deleted");
    },
  });

  // Open edit dialog with current values
  const handleOpenEdit = () => {
    if (study) {
      setEditTitle(study.title);
      setEditProblem(study.problem_statement);
      setEditSolution(study.solution_goal);
      setEditStatus(study.status || "planning");
      setShowEditDialog(true);
    }
  };

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
              <Badge variant={study.status === 'completed' ? 'default' : study.status === 'in_progress' ? 'secondary' : 'outline'}>
                {study.status}
              </Badge>
              {study.archived_at && <Badge variant="secondary">Archived</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">Created {format(new Date(study.created_at), 'PPP')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            {!study.archived_at && (
              <Button variant="outline" size="sm" onClick={() => archiveStudyMutation.mutate()}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Study Plan</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this study plan and all associated interviews, observations, and personas. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteStudyMutation.mutate()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Edit Study Plan Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Study Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-problem">Problem Statement</Label>
                <Textarea
                  id="edit-problem"
                  value={editProblem}
                  onChange={(e) => setEditProblem(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-solution">Solution Goal</Label>
                <Textarea
                  id="edit-solution"
                  value={editSolution}
                  onChange={(e) => setEditSolution(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => editStudyMutation.mutate()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

            <Collapsible open={aiPlanExpanded} onOpenChange={setAiPlanExpanded}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <div className="flex justify-between items-center cursor-pointer">
                      <div className="flex items-center gap-2">
                        <CardTitle>AI-Generated Study Plan</CardTitle>
                        {study.ai_suggestions && (
                          <Badge variant="secondary" className="ml-2">
                            Ready
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!aiPlanExpanded && study.ai_suggestions && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              convertToStepsMutation.mutate();
                            }}
                            disabled={convertToStepsMutation.isPending}
                          >
                            <ListTodo className="mr-2 h-4 w-4" />
                            Convert to Steps
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="ml-2"
                        >
                          {aiPlanExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Expand
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  {!study.ai_suggestions && !aiPlanExpanded && (
                    <CardDescription className="mt-2">
                      Click to generate an AI-powered research plan
                    </CardDescription>
                  )}
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 justify-end">
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
                    {generateAISuggestionsMutation.isPending ? (
                      <div className="text-center py-8">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse text-primary" />
                        <p className="text-muted-foreground">Generating AI suggestions...</p>
                      </div>
                    ) : study.ai_suggestions ? (
                      <div className="whitespace-pre-wrap text-sm border rounded-lg p-4 bg-muted/50 max-h-96 overflow-y-auto">
                        {typeof study.ai_suggestions === 'object' && study.ai_suggestions && 'suggestions' in study.ai_suggestions 
                          ? String(study.ai_suggestions.suggestions)
                          : JSON.stringify(study.ai_suggestions, null, 2)
                        }
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Click "Generate Plan" to create an AI-powered research plan</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge variant="outline">Step {step.order}</Badge>
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
                                      Persona
                                    </Badge>
                                  )}
                                  {isAnalysisStep && (
                                    <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                      Analysis
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-lg">{step.title}</CardTitle>
                                {step.description && (
                                  <CardDescription className="mt-2">{step.description}</CardDescription>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Interview Sessions ({interviews?.length || 0})</h3>
              <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Interview
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
                {interviews.map((interview: any) => (
                  <Card key={interview.id} className="group relative cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader onClick={() => navigate(`/research/interview/${interview.id}`)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{interview.participant_name}</CardTitle>
                          <CardDescription>
                            {interview.scheduled_at
                              ? `Scheduled: ${format(new Date(interview.scheduled_at), "PPP 'at' p")}`
                              : "Not scheduled"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{interview.status || "scheduled"}</Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Interview</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete this interview session and all associated observations.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteInterviewMutation.mutate(interview.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-4">
                    No interviews scheduled yet.
                  </p>
                  <Button onClick={() => setNewInterviewOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule First Interview
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="observations" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Research Observations ({observations?.length || 0})</h3>
              <Button onClick={() => navigate(`/research/study/${id}/observations`)}>
                <Plus className="w-4 h-4 mr-2" />
                View Observations Board
              </Button>
            </div>

            {observations && observations.length > 0 ? (
              <div className="grid gap-4">
                {observations.map((obs: any) => (
                  <Card key={obs.id} className="group relative">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{obs.observation_type}</Badge>
                          </div>
                          <p className="text-sm">{obs.content}</p>
                          {obs.tags && obs.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {obs.tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Lightbulb className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-4">
                    No observations recorded yet.
                  </p>
                  <Button onClick={() => navigate(`/research/study/${id}/observations`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Go to Observations Board
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="personas" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">User Personas ({personas?.length || 0})</h3>
              <Button onClick={() => navigate(`/research/study/${id}/persona/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                New Persona
              </Button>
            </div>

            {personas && personas.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {personas.map((persona: any) => (
                  <Card key={persona.id} className="group relative cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader onClick={() => navigate(`/research/persona/${persona.id}`)}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>{persona.name}</CardTitle>
                          <CardDescription>{persona.description}</CardDescription>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Persona</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this persona.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePersonaMutation.mutate(persona.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent onClick={() => navigate(`/research/persona/${persona.id}`)}>
                      {persona.goals && persona.goals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">Goals:</p>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {persona.goals.slice(0, 3).map((goal: string, idx: number) => (
                              <li key={idx}>{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <UserCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-4">
                    No personas created yet.
                  </p>
                  <Button onClick={() => navigate(`/research/study/${id}/persona/new`)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Persona
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}