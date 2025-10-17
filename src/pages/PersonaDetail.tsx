import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Target, AlertCircle, User } from "lucide-react";

export default function PersonaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: persona, isLoading } = useQuery({
    queryKey: ['persona', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*, study_plans(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${persona.study_plan_id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold">{persona.name}</h1>
            {persona.description && (
              <p className="text-muted-foreground mt-1">{persona.description}</p>
            )}
          </div>
          <Button onClick={() => navigate(`/research/study/${persona.study_plan_id}/persona/${persona.id}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
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
        </div>
      </div>
    </DashboardLayout>
  );
}