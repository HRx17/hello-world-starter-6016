import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Users, MessageSquare, Sparkles, Plus, Calendar } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StepWorkspace() {
  const { studyId, stepId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState("");
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: study } = useQuery({
    queryKey: ['study-plan', studyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('id', studyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const step = ((study?.plan_steps as any[]) || []).find((s: any) => s.id === stepId);

  const { data: guidanceData, isLoading: loadingGuidance } = useQuery({
    queryKey: ['step-guidance', stepId],
    queryFn: async () => {
      const studyContext = `Problem: ${study?.problem_statement}\nGoal: ${study?.solution_goal}`;
      
      const { data, error } = await supabase.functions.invoke('get-step-guidance', {
        body: { 
          stepTitle: step?.title,
          stepDescription: step?.description,
          studyContext
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!step && !!study,
  });

  const completeStepMutation = useMutation({
    mutationFn: async () => {
      const currentSteps = (study?.plan_steps as any[]) || [];
      const updatedSteps = currentSteps.map(s => 
        s.id === stepId ? { ...s, completed: true, notes, completed_at: new Date().toISOString() } : s
      );

      const { error } = await supabase
        .from('study_plans')
        .update({ plan_steps: updatedSteps })
        .eq('id', studyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', studyId] });
      toast.success("Step marked as complete!");
      navigate(`/research/study/${studyId}?tab=plan`);
    },
    onError: () => {
      toast.error("Failed to complete step");
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
          study_plan_id: studyId,
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
      queryClient.invalidateQueries({ queryKey: ['study-interviews', studyId] });
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

  if (!step) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Step not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const isInterviewStep = step.title.toLowerCase().includes('interview');
  const isObservationStep = step.title.toLowerCase().includes('observation') || 
                          step.title.toLowerCase().includes('field') ||
                          step.title.toLowerCase().includes('diary');
  const isPersonaStep = step.title.toLowerCase().includes('persona');
  const isAnalysisStep = step.title.toLowerCase().includes('analysis') || 
                       step.title.toLowerCase().includes('synthesis');

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${studyId}?tab=plan`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
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
              {step.completed && <Badge variant="secondary">Completed</Badge>}
            </div>
            <h1 className="text-4xl font-bold">{step.title}</h1>
            {step.description && (
              <p className="text-muted-foreground mt-2">{step.description}</p>
            )}
          </div>
        </div>

        <Tabs defaultValue="guidance" className="w-full">
          <TabsList>
            <TabsTrigger value="guidance">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Guidance
            </TabsTrigger>
            <TabsTrigger value="tools">
              <FileText className="mr-2 h-4 w-4" />
              Tools & Templates
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="mr-2 h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guidance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Step Guidance
                </CardTitle>
                <CardDescription>
                  AI-powered recommendations for completing this step effectively
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGuidance ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Generating personalized guidance...
                  </div>
                ) : guidanceData?.guidance ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{guidanceData.guidance}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No guidance available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Tools and features to help you complete this step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {isInterviewStep && (
                    <>
                      <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            <Users className="mr-2 h-4 w-4" />
                            Schedule Interview Session
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
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => navigate(`/research/study/${studyId}?tab=interviews`)}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        View All Interviews
                      </Button>
                    </>
                  )}
                  
                  {isObservationStep && (
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => navigate(`/research/study/${studyId}/observations`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Record Observation
                    </Button>
                  )}

                  {isPersonaStep && (
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => navigate(`/research/study/${studyId}/persona/new`)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Persona
                    </Button>
                  )}

                  {isAnalysisStep && (
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => navigate(`/research/study/${studyId}/observations`)}
                    >
                      <Lightbulb className="mr-2 h-4 w-4" />
                      View Research Data
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Step Notes</CardTitle>
                <CardDescription>
                  Document your progress, insights, and decisions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add notes about this step..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={10}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Mark Step as Complete</h3>
                  <p className="text-sm text-muted-foreground">
                    Once you've finished this step, mark it complete to track your progress
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => completeStepMutation.mutate()}
                disabled={step.completed || completeStepMutation.isPending}
              >
                {step.completed ? "Completed" : "Complete Step"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}