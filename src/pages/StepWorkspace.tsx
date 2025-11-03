import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Users, MessageSquare, Sparkles, Plus, Calendar, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StepWorkspace() {
  const { studyId, stepId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [newInterviewOpen, setNewInterviewOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [enableGuidance, setEnableGuidance] = useState(false);

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
  const allSteps = ((study?.plan_steps as any[]) || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  const currentIndex = allSteps.findIndex((s: any) => s.id === stepId);
  const prevStep = currentIndex > 0 ? allSteps[currentIndex - 1] : null;
  const nextStep = currentIndex < allSteps.length - 1 ? allSteps[currentIndex + 1] : null;

  // Load step notes from database
  const { data: stepNotes } = useQuery({
    queryKey: ['step-notes', studyId, stepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('step_notes')
        .select('*')
        .eq('study_plan_id', studyId)
        .eq('step_id', stepId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setNotes(data.notes || "");
      return data;
    },
  });

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
    enabled: !!step && !!study && enableGuidance,
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('step_notes')
        .upsert({
          study_plan_id: studyId,
          step_id: stepId,
          notes,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['step-notes', studyId, stepId] });
      toast.success("Notes saved!");
    },
  });

  const completeStepMutation = useMutation({
    mutationFn: async () => {
      const currentSteps = (study?.plan_steps as any[]) || [];
      const updatedSteps = currentSteps.map(s => 
        s.id === stepId ? { ...s, completed: true, completed_at: new Date().toISOString() } : s
      );

      const { error } = await supabase
        .from('study_plans')
        .update({ plan_steps: updatedSteps })
        .eq('id', studyId);

      if (error) throw error;
      
      // Also save notes if any
      if (notes.trim()) {
        await saveNotesMutation.mutateAsync();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan', studyId] });
      toast.success("Step marked as complete!");
      navigate(`/research/study/${studyId}?tab=plan`);
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
      toast.success("Interview created!");
      setNewInterviewOpen(false);
      setParticipantName("");
      setScheduledDate("");
      navigate(`/research/interview/${data.id}`);
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
  const isObservationStep = step.title.toLowerCase().includes('observation');
  const isPersonaStep = step.title.toLowerCase().includes('persona');
  const isAnalysisStep = step.title.toLowerCase().includes('analysis');

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb with progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/research')}>Research</Button>
            <span>/</span>
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/research/study/${studyId}`)}>Study</Button>
            <span>/</span>
            <span>Step {step.order}</span>
          </div>
          <Badge variant="outline">Step {currentIndex + 1} of {allSteps.length}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${studyId}?tab=plan`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">Step {step.order}</Badge>
              {step.completed && <Badge variant="secondary">Completed</Badge>}
            </div>
            <h1 className="text-4xl font-bold">{step.title}</h1>
            {step.description && <p className="text-muted-foreground mt-2">{step.description}</p>}
          </div>
        </div>

        <Tabs defaultValue="guidance" className="w-full">
          <TabsList>
            <TabsTrigger value="guidance"><Sparkles className="mr-2 h-4 w-4" />AI Guidance</TabsTrigger>
            <TabsTrigger value="tools"><FileText className="mr-2 h-4 w-4" />Tools</TabsTrigger>
            <TabsTrigger value="notes"><MessageSquare className="mr-2 h-4 w-4" />Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="guidance">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Guidance</CardTitle>
                <CardDescription>Get personalized recommendations for this step</CardDescription>
              </CardHeader>
              <CardContent>
                {!enableGuidance && !guidanceData?.guidance ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <Button onClick={() => setEnableGuidance(true)} size="lg">
                      <Sparkles className="mr-2 h-4 w-4" />Generate AI Guidance
                    </Button>
                  </div>
                ) : loadingGuidance ? (
                  <div className="text-center py-8"><Sparkles className="h-5 w-5 animate-pulse mx-auto" />Generating...</div>
                ) : guidanceData?.guidance ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{guidanceData.guidance}</ReactMarkdown>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {isInterviewStep && (
                  <Dialog open={newInterviewOpen} onOpenChange={setNewInterviewOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="justify-start"><Users className="mr-2 h-4 w-4" />Schedule Interview</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Participant Name</Label><Input value={participantName} onChange={(e) => setParticipantName(e.target.value)} /></div>
                        <div><Label>Date & Time</Label><Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
                        <Button onClick={() => createInterviewMutation.mutate()} disabled={!participantName} className="w-full">Create</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {isObservationStep && <Button variant="outline" className="justify-start" onClick={() => navigate(`/research/study/${studyId}/observations`)}><Plus className="mr-2 h-4 w-4" />Record Observation</Button>}
                {isPersonaStep && <Button variant="outline" className="justify-start" onClick={() => navigate(`/research/study/${studyId}/persona/new`)}><Plus className="mr-2 h-4 w-4" />Create Persona</Button>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Step Notes</CardTitle>
                <CardDescription>Document your progress and insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} />
                <Button onClick={() => saveNotesMutation.mutate()} className="w-full"><Save className="mr-2 h-4 w-4" />Save Notes</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation and Complete */}
        <div className="flex justify-between items-center gap-4">
          <Button variant="outline" disabled={!prevStep} onClick={() => prevStep && navigate(`/research/study/${studyId}/step/${prevStep.id}`)}>
            <ChevronLeft className="mr-2 h-4 w-4" />Previous Step
          </Button>
          <Button onClick={() => completeStepMutation.mutate()} disabled={step.completed}>
            <CheckCircle2 className="mr-2 h-4 w-4" />{step.completed ? "Completed" : "Complete Step"}
          </Button>
          <Button variant="outline" disabled={!nextStep} onClick={() => nextStep && navigate(`/research/study/${studyId}/step/${nextStep.id}`)}>
            Next Step<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}