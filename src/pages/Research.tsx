import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Users, Lightbulb, UserCircle, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Research() {
  const navigate = useNavigate();
  const [view, setView] = useState<"overview" | "studies" | "interviews" | "insights" | "personas">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

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

  const { data: observations } = useQuery({
    queryKey: ['research-observations-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_observations')
        .select('id');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: clusters } = useQuery({
    queryKey: ['insight-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insight_clusters')
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

  // Filter and search logic
  const filteredStudies = studyPlans?.filter(study => {
    const matchesSearch = study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.problem_statement.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || study.status === statusFilter;
    const matchesTags = tagFilter === "all" || (study.tags && study.tags.includes(tagFilter));
    return matchesSearch && matchesStatus && matchesTags;
  });

  const filteredInterviews = interviews?.filter(interview => {
    const matchesSearch = interview.participant_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPersonas = personas?.filter(persona => {
    const matchesSearch = persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(studyPlans?.flatMap(s => s.tags || []) || []));

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">UX Research</h1>
            <p className="text-muted-foreground mt-2">Plan studies, conduct interviews, and synthesize insights</p>
          </div>
          <div className="flex gap-2">
            {view === "interviews" && (
              <Button variant="outline" onClick={() => navigate('/research/interview/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Interview
              </Button>
            )}
            {view === "personas" && (
              <Button variant="outline" onClick={() => navigate('/research/persona/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Persona
              </Button>
            )}
            <Button onClick={() => navigate('/research/new-study')}>
              <Plus className="mr-2 h-4 w-4" />
              New Study Plan
            </Button>
          </div>
        </div>

        {(view === "studies" || view === "interviews" || view === "personas") && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {(view === "studies" || view === "interviews") && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      {view === "interviews" && (
                        <>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="conducted">Conducted</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {view === "studies" && allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                <CardTitle className="text-2xl">{observations?.length || 0}</CardTitle>
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
            ) : filteredStudies && filteredStudies.length > 0 ? (
              filteredStudies.map((study) => (
                <Card key={study.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/research/study/${study.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{study.title}</CardTitle>
                        <CardDescription>
                          Created {format(new Date(study.created_at), 'PPP')} • Status: {study.status}
                        </CardDescription>
                      </div>
                      {study.tags && study.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {study.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{study.problem_statement}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No study plans found</CardTitle>
                  <CardDescription>
                    {searchQuery || statusFilter !== "all" || tagFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first study plan to get started"}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}

        {view === "interviews" && (
          <div className="space-y-4">
            {loadingInterviews ? (
              <p>Loading interviews...</p>
            ) : filteredInterviews && filteredInterviews.length > 0 ? (
              filteredInterviews.map((interview) => (
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
                  <CardTitle>No interviews found</CardTitle>
                  <CardDescription>
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Schedule your first interview from a study plan"}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}

        {view === "insights" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Insights & Affinity Mapping</CardTitle>
                <CardDescription>View organized research observations by study plan</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/research/observations')}>
                  Go to Observations Board
                </Button>
              </CardContent>
            </Card>

            {clusters && clusters.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Recent Insight Clusters</h3>
                {clusters.slice(0, 5).map((cluster) => (
                  <Card key={cluster.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {cluster.color && (
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cluster.color }} />
                        )}
                        {cluster.title}
                      </CardTitle>
                      {cluster.description && (
                        <CardDescription>{cluster.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "personas" && (
          <div className="space-y-4">
            {loadingPersonas ? (
              <p>Loading personas...</p>
            ) : filteredPersonas && filteredPersonas.length > 0 ? (
              filteredPersonas.map((persona) => (
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
                  <CardTitle>No personas found</CardTitle>
                  <CardDescription>
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Create personas based on your research findings"}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}