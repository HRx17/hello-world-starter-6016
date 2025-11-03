import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Target, AlertCircle, User, Download, Copy, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function PersonaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: persona, isLoading } = useQuery({
    queryKey: ['persona', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*, study_plans(*)')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch related interviews
  const { data: relatedInterviews } = useQuery({
    queryKey: ['persona-interviews', id],
    enabled: !!persona?.source_interview_ids && persona.source_interview_ids.length > 0,
    queryFn: async () => {
      if (!persona?.source_interview_ids) return [];
      
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .in('id', persona.source_interview_ids);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch related observations
  const { data: relatedObservations } = useQuery({
    queryKey: ['persona-observations', id],
    enabled: !!persona?.source_observation_ids && persona.source_observation_ids.length > 0,
    queryFn: async () => {
      if (!persona?.source_observation_ids) return [];
      
      const { data, error } = await supabase
        .from('research_observations')
        .select('*')
        .in('id', persona.source_observation_ids);
      
      if (error) throw error;
      return data;
    },
  });

  const deletePersonaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Persona deleted");
      navigate(persona?.study_plan_id ? `/research/study/${persona.study_plan_id}` : '/research');
    },
  });

  const duplicatePersonaMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('personas')
        .insert({
          user_id: user.id,
          study_plan_id: persona?.study_plan_id,
          name: `${persona?.name} (Copy)`,
          description: persona?.description,
          goals: persona?.goals,
          pain_points: persona?.pain_points,
          demographics: persona?.demographics,
          behaviors: persona?.behaviors,
          avatar_url: persona?.avatar_url,
          source_interview_ids: persona?.source_interview_ids,
          source_observation_ids: persona?.source_observation_ids,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-personas'] });
      toast.success("Persona duplicated");
      navigate(`/research/persona/${data.id}`);
    },
  });

  const exportPersona = () => {
    if (!persona) return;
    
    const demographics = persona.demographics as any;
    const behaviors = persona.behaviors as any;
    
    const content = `
USER PERSONA: ${persona.name}
${'='.repeat(persona.name.length + 14)}

${persona.description ? `${persona.description}\n` : ''}

DEMOGRAPHICS:
${demographics?.age ? `• Age: ${demographics.age}` : ''}
${demographics?.occupation ? `• Occupation: ${demographics.occupation}` : ''}
${demographics?.tech_savviness ? `• Tech Savviness: ${demographics.tech_savviness}` : ''}

GOALS:
${persona.goals?.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n') || 'None specified'}

PAIN POINTS:
${persona.pain_points?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') || 'None specified'}

${behaviors ? `
BEHAVIORS:
${Object.entries(behaviors).map(([key, value]) => `• ${key}: ${value}`).join('\n')}
` : ''}

${relatedInterviews && relatedInterviews.length > 0 ? `
BASED ON INTERVIEWS:
${relatedInterviews.map(int => `• ${int.participant_name}`).join('\n')}
` : ''}

${relatedObservations && relatedObservations.length > 0 ? `
BASED ON OBSERVATIONS:
${relatedObservations.map((obs, i) => `${i + 1}. ${obs.content.substring(0, 100)}...`).join('\n')}
` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-${persona.name.replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Persona exported!");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Loading persona...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!persona) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <p>Persona not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const demographics = persona.demographics as any;
  const behaviors = persona.behaviors as any;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/research')}>
            Research
          </Button>
          <span>/</span>
          {persona.study_plans && (
            <>
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/research/study/${persona.study_plan_id}`)}>
                {persona.study_plans.title}
              </Button>
              <span>/</span>
            </>
          )}
          <span>Persona</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${persona.study_plan_id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={persona.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {persona.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">{persona.name}</h1>
            {persona.description && (
              <p className="text-muted-foreground mt-1">{persona.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/research/study/${persona.study_plan_id}/persona/${persona.id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => duplicatePersonaMutation.mutate()}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={exportPersona}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Persona</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this persona. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deletePersonaMutation.mutate()}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Demographics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {demographics?.age && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Age</p>
                  <p className="text-lg">{demographics.age}</p>
                </div>
              )}
              {demographics?.occupation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                  <p className="text-lg">{demographics.occupation}</p>
                </div>
              )}
              {demographics?.tech_savviness && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tech Savviness</p>
                  <p className="text-lg">{demographics.tech_savviness}</p>
                </div>
              )}
              {!demographics?.age && !demographics?.occupation && !demographics?.tech_savviness && (
                <p className="text-sm text-muted-foreground">No demographics defined</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {persona.goals && persona.goals.length > 0 ? (
                <ul className="space-y-2">
                  {persona.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No goals defined</p>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pain Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {persona.pain_points && persona.pain_points.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {persona.pain_points.map((pain, index) => (
                    <div key={index} className="p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm">{pain}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pain points defined</p>
              )}
            </CardContent>
          </Card>

          {behaviors && Object.keys(behaviors).length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Behaviors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(behaviors).map(([key, value], index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-semibold">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {((relatedInterviews && relatedInterviews.length > 0) || (relatedObservations && relatedObservations.length > 0)) && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Related Research</CardTitle>
                <CardDescription>Sources that informed this persona</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {relatedInterviews && relatedInterviews.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Interviews:</p>
                    <div className="space-y-2">
                      {relatedInterviews.map((interview) => (
                        <Badge key={interview.id} variant="secondary" className="mr-2">
                          {interview.participant_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {relatedObservations && relatedObservations.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Observations ({relatedObservations.length}):</p>
                    <div className="space-y-2">
                      {relatedObservations.slice(0, 3).map((obs) => (
                        <div key={obs.id} className="text-sm p-2 bg-muted rounded">
                          {obs.content.substring(0, 100)}...
                        </div>
                      ))}
                      {relatedObservations.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          And {relatedObservations.length - 3} more observations
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}