import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Play, Save, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function InterviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [quickObservation, setQuickObservation] = useState("");
  const [duration, setDuration] = useState("");

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*, study_plans(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setNotes(data.notes || "");
      setDuration(data.duration_minutes?.toString() || "");
      return data;
    },
  });

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
      const { error } = await supabase
        .from('interview_sessions')
        .update({ 
          status: 'completed',
          notes,
          duration_minutes: duration ? parseInt(duration) : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      toast.success("Interview completed!");
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${interview.study_plan_id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold">Interview: {interview.participant_name}</h1>
              <Badge>{interview.status}</Badge>
            </div>
            {interview.scheduled_at && (
              <p className="text-muted-foreground mt-1">
                Scheduled for {format(new Date(interview.scheduled_at), 'PPP p')}
              </p>
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
          </div>
        </div>

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
                    placeholder="45"
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
                      <div key={obs.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{obs.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(obs.created_at), 'p')}
                        </p>
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