import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Calendar, Users, Lightbulb, UserCircle, Edit, Sparkles } from "lucide-react";
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateAISuggestionsMutation.mutate()}
                    disabled={generateAISuggestionsMutation.isPending}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {study.ai_suggestions ? "Regenerate Plan" : "Generate Plan"}
                  </Button>
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

          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Interview Sessions</h2>
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
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/research/interview/${interview.id}`)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{interview.participant_name}</CardTitle>
                          <CardDescription>
                            {interview.scheduled_at 
                              ? `Scheduled: ${format(new Date(interview.scheduled_at), 'PPP p')}`
                              : 'Not scheduled yet'
                            }
                          </CardDescription>
                        </div>
                        <Badge>{interview.status}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No interviews scheduled</CardTitle>
                  <CardDescription>Schedule your first interview to begin research</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="observations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Research Observations</h2>
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
              <Card>
                <CardHeader>
                  <CardTitle>No observations yet</CardTitle>
                  <CardDescription>Record observations from your research sessions</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="personas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Personas</h2>
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
              <Card>
                <CardHeader>
                  <CardTitle>No personas created</CardTitle>
                  <CardDescription>Create personas based on your research insights</CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}