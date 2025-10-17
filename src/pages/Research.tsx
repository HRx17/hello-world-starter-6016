import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Users, Lightbulb, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Research() {
  const navigate = useNavigate();
  const [view, setView] = useState<"overview" | "studies" | "interviews" | "insights" | "personas">("overview");

  const { data: studyPlans, isLoading: loadingStudies } = useQuery({
    queryKey: ['study-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: interviews, isLoading: loadingInterviews } = useQuery({
    queryKey: ['interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">UX Research</h1>
            <p className="text-muted-foreground mt-2">Plan studies, conduct interviews, and synthesize insights</p>
          </div>
          <Button onClick={() => navigate('/research/new-study')}>
            <Plus className="mr-2 h-4 w-4" />
            New Study Plan
          </Button>
        </div>

        <div className="flex gap-2 border-b">
          <Button
            variant={view === "overview" ? "default" : "ghost"}
            onClick={() => setView("overview")}
          >
            Overview
          </Button>
          <Button
            variant={view === "studies" ? "default" : "ghost"}
            onClick={() => setView("studies")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Study Plans
          </Button>
          <Button
            variant={view === "interviews" ? "default" : "ghost"}
            onClick={() => setView("interviews")}
          >
            <Users className="mr-2 h-4 w-4" />
            Interviews
          </Button>
          <Button
            variant={view === "insights" ? "default" : "ghost"}
            onClick={() => setView("insights")}
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Insights
          </Button>
          <Button
            variant={view === "personas" ? "default" : "ghost"}
            onClick={() => setView("personas")}
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Personas
          </Button>
        </div>

        {view === "overview" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{studyPlans?.length || 0}</CardTitle>
                <CardDescription>Active Studies</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{interviews?.length || 0}</CardTitle>
                <CardDescription>Interviews Conducted</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">0</CardTitle>
                <CardDescription>Insights Captured</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{personas?.length || 0}</CardTitle>
                <CardDescription>Personas Created</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {view === "studies" && (
          <div className="space-y-4">
            {loadingStudies ? (
              <p>Loading study plans...</p>
            ) : studyPlans && studyPlans.length > 0 ? (
              studyPlans.map((study) => (
                <Card key={study.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/research/study/${study.id}`)}>
                  <CardHeader>
                    <CardTitle>{study.title}</CardTitle>
                    <CardDescription>
                      Created {format(new Date(study.created_at), 'PPP')} • Status: {study.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{study.problem_statement}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No study plans yet</CardTitle>
                  <CardDescription>Create your first study plan to get started</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}

        {view === "interviews" && (
          <div className="space-y-4">
            {loadingInterviews ? (
              <p>Loading interviews...</p>
            ) : interviews && interviews.length > 0 ? (
              interviews.map((interview) => (
                <Card key={interview.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/research/interview/${interview.id}`)}>
                  <CardHeader>
                    <CardTitle>{interview.participant_name}</CardTitle>
                    <CardDescription>
                      {interview.conducted_at 
                        ? `Conducted ${format(new Date(interview.conducted_at), 'PPP')}`
                        : `Scheduled for ${interview.scheduled_at ? format(new Date(interview.scheduled_at), 'PPP') : 'TBD'}`
                      } • Status: {interview.status}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No interviews yet</CardTitle>
                  <CardDescription>Schedule your first interview from a study plan</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}

        {view === "insights" && (
          <Card>
            <CardHeader>
              <CardTitle>Insights & Affinity Mapping</CardTitle>
              <CardDescription>Cluster and synthesize research findings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Insight clustering feature coming soon</p>
            </CardContent>
          </Card>
        )}

        {view === "personas" && (
          <div className="space-y-4">
            {loadingPersonas ? (
              <p>Loading personas...</p>
            ) : personas && personas.length > 0 ? (
              personas.map((persona) => (
                <Card key={persona.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/research/persona/${persona.id}`)}>
                  <CardHeader>
                    <CardTitle>{persona.name}</CardTitle>
                    <CardDescription>{persona.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No personas yet</CardTitle>
                  <CardDescription>Create personas based on your research findings</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}