import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Play, Save, Clock, CheckCircle, Pencil, Trash2, Calendar, Download, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [quickObservation, setQuickObservation] = useState("");
  const [duration, setDuration] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Edit interview state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editScheduled, setEditScheduled] = useState("");

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*, study_plans(*)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setNotes(data.notes || "");
        setDuration(data.duration_minutes?.toString() || "");
        setEditName(data.participant_name);
        setEditScheduled(data.scheduled_at || "");
        
        // Start timer if interview is in progress
        if (data.status === 'in_progress' && data.conducted_at) {
          setTimerRunning(true);
          const startTime = new Date(data.conducted_at).getTime();
          const now = Date.now();
          setElapsedTime(Math.floor((now - startTime) / 1000));
        }
      }
      return data;
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const { data: observations } = useQuery({
    queryKey: ['interview-observations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .eq('interview_session_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('interview_sessions')
        .update({ 
          status: 'in_progress',
          conducted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      setTimerRunning(true);
      setElapsedTime(0);
      toast.success("Interview started!");
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('interview_sessions')
        .update({ 
          notes,
          duration_minutes: duration ? parseInt(duration) : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      toast.success("Notes saved!");
    },
  });

  const completeInterviewMutation = useMutation({
    mutationFn: async () => {
      const finalDuration = duration || Math.floor(elapsedTime / 60).toString();
      const { error } = await supabase
        .from('interview_sessions')
        .update({ 
          status: 'completed',
          notes,
          duration_minutes: finalDuration ? parseInt(finalDuration) : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      setTimerRunning(false);
      toast.success("Interview completed!");
    },
  });

  const editInterviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('interview_sessions')
        .update({ 
          participant_name: editName,
          scheduled_at: editScheduled ? new Date(editScheduled).toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      toast.success("Interview updated");
      setShowEditDialog(false);
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('interview_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interview deleted");
      navigate(interview?.study_plan_id ? `/research/study/${interview.study_plan_id}` : '/research');
    },
  });

  const addObservationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('research_observations')
        .insert({
          user_id: user.id,
          study_plan_id: interview?.study_plan_id,
          interview_session_id: id,
          observation_type: 'note',
          content: quickObservation,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-observations', id] });
      setQuickObservation("");
      toast.success("Observation recorded!");
    },
  });

  const deleteObservationMutation = useMutation({
    mutationFn: async (observationId: string) => {
      const { error } = await supabase
        .from('research_observations')
        .delete()
        .eq('id', observationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-observations', id] });
      toast.success("Observation deleted");
    },
  });

  const exportNotes = () => {
    if (!interview) return;
    
    const content = `
INTERVIEW NOTES
===============

Participant: ${interview.participant_name}
Date: ${interview.conducted_at ? format(new Date(interview.conducted_at), 'PPP p') : 'Not conducted'}
Duration: ${interview.duration_minutes || 'N/A'} minutes
Status: ${interview.status}

NOTES:
${notes || 'No notes recorded'}

OBSERVATIONS:
${observations?.map((obs, i) => `${i + 1}. ${obs.content}`).join('\n') || 'No observations'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-${interview.participant_name.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Notes exported!");
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Loading interview session...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!interview) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Interview session not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/research')}>
            Research
          </Button>
          <span>/</span>
          {interview.study_plans && (
            <>
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/research/study/${interview.study_plan_id}`)}>
                {interview.study_plans.title}
              </Button>
              <span>/</span>
            </>
          )}
          <span>Interview</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${interview.study_plan_id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">Interview: {interview.participant_name}</h1>
              <Badge variant={interview.status === 'completed' ? 'default' : interview.status === 'in_progress' ? 'secondary' : 'outline'}>
                {interview.status}
              </Badge>
            </div>
            {interview.scheduled_at && (
              <p className="text-muted-foreground mt-1">
                Scheduled for {format(new Date(interview.scheduled_at), 'PPP p')}
              </p>
            )}
            {timerRunning && (
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-lg font-mono font-bold text-primary">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {interview.status === 'scheduled' && (
              <Button onClick={() => startInterviewMutation.mutate()}>
                <Play className="mr-2 h-4 w-4" />
                Start Interview
              </Button>
            )}
            {interview.status === 'in_progress' && (
              <Button onClick={() => completeInterviewMutation.mutate()}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Interview
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportNotes}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Notes
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Interview
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Interview</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this interview and all associated observations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteInterviewMutation.mutate()}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Edit Interview Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Interview Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Participant Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-scheduled">Scheduled Date & Time</Label>
                <Input
                  id="edit-scheduled"
                  type="datetime-local"
                  value={editScheduled ? new Date(editScheduled).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditScheduled(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => editInterviewMutation.mutate()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Notes</CardTitle>
                <CardDescription>Take notes during the interview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your interview notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={15}
                />
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder={timerRunning ? Math.floor(elapsedTime / 60).toString() : "45"}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <Button onClick={() => saveNotesMutation.mutate()} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Observation</CardTitle>
                <CardDescription>Record key insights as they happen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Record a quick observation or insight..."
                  value={quickObservation}
                  onChange={(e) => setQuickObservation(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={() => addObservationMutation.mutate()} 
                  disabled={!quickObservation.trim()}
                  className="w-full"
                >
                  Add Observation
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Observations ({observations?.length || 0})</CardTitle>
                <CardDescription>Insights captured during this interview</CardDescription>
              </CardHeader>
              <CardContent>
                {observations && observations.length > 0 ? (
                  <div className="space-y-3">
                    {observations.map((obs) => (
                      <div key={obs.id} className="p-3 bg-muted rounded-lg group relative">
                        <p className="text-sm pr-8">{obs.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(obs.created_at), 'p')}
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
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
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No observations recorded yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interview Guide</CardTitle>
                <CardDescription>Questions to ask</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">1.</span>
                    <span>Can you tell me about your experience with [product/service]?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">2.</span>
                    <span>What challenges have you faced?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">3.</span>
                    <span>How do you currently solve [problem]?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">4.</span>
                    <span>What would make your experience better?</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}