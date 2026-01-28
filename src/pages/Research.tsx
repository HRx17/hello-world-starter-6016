import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Users, UserCircle, Search, Brain, Map, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Research() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: studyPlans, isLoading: loadingStudies } = useQuery({
    queryKey: ['study-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: interviews } = useQuery({
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

  const { data: personas } = useQuery({
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

  const filteredStudies = studyPlans?.filter(study =>
    study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    study.problem_statement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInterviews = interviews?.filter(interview =>
    interview.participant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPersonas = personas?.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">UX Research</h1>
            <p className="text-muted-foreground">Plan studies, conduct interviews, and build personas</p>
          </div>
          <Button onClick={() => navigate('/research/new-study')}>
            <Plus className="mr-2 h-4 w-4" />
            New Study
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/research/mind-mapping')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Mind Maps</p>
                <p className="text-xs text-muted-foreground">Visual thinking</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/research/user-journey')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Journey Maps</p>
                <p className="text-xs text-muted-foreground">User flows</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/research/information-architecture')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Site Maps</p>
                <p className="text-xs text-muted-foreground">IA structures</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/research/observations')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Observations</p>
                <p className="text-xs text-muted-foreground">Insights board</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search studies, interviews, personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="studies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="studies" className="gap-2">
              <FileText className="h-4 w-4" />
              Studies ({filteredStudies?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="interviews" className="gap-2">
              <Users className="h-4 w-4" />
              Interviews ({filteredInterviews?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="personas" className="gap-2">
              <UserCircle className="h-4 w-4" />
              Personas ({filteredPersonas?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="studies" className="space-y-4">
            {loadingStudies ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredStudies && filteredStudies.length > 0 ? (
              <div className="grid gap-4">
                {filteredStudies.map((study) => (
                  <Card 
                    key={study.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/research/study/${study.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{study.title}</CardTitle>
                          <CardDescription>
                            {format(new Date(study.created_at), 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                        <Badge variant={study.status === 'active' ? 'default' : 'secondary'}>
                          {study.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {study.problem_statement}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No studies match your search" : "No studies yet"}
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/research/new-study')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Study
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate('/research/interview/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Interview
              </Button>
            </div>
            {filteredInterviews && filteredInterviews.length > 0 ? (
              <div className="grid gap-4">
                {filteredInterviews.map((interview) => (
                  <Card 
                    key={interview.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/research/interview/${interview.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{interview.participant_name}</CardTitle>
                        <Badge variant={interview.status === 'conducted' ? 'default' : 'outline'}>
                          {interview.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {interview.conducted_at 
                          ? `Conducted ${format(new Date(interview.conducted_at), 'MMM d, yyyy')}`
                          : interview.scheduled_at 
                            ? `Scheduled for ${format(new Date(interview.scheduled_at), 'MMM d, yyyy')}`
                            : 'Not scheduled'
                        }
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No interviews match your search" : "No interviews yet"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="personas" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate('/research/persona/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Persona
              </Button>
            </div>
            {filteredPersonas && filteredPersonas.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPersonas.map((persona) => (
                  <Card 
                    key={persona.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/research/persona/${persona.id}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{persona.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {persona.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    {(persona.goals?.length > 0 || persona.pain_points?.length > 0) && (
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {persona.goals?.slice(0, 2).map((goal, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No personas match your search" : "No personas yet"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}