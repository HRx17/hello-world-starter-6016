import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  FileText, 
  UserCircle, 
  Target, 
  ArrowRight,
  Lightbulb,
  Clock,
  Sparkles,
  Users,
  ImageIcon,
  TrendingUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface StudyPlan {
  id: string;
  title: string;
  problem_statement: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Persona {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Interview {
  id: string;
  participant_name: string;
  status: string;
  created_at: string;
}

interface ScreenshotAnalysis {
  id: string;
  image_url: string;
  score: number | null;
  violations: any;
  analyzed_at: string;
}

interface ActivityItem {
  id: string;
  type: 'study' | 'persona' | 'interview' | 'audit';
  title: string;
  date: Date;
  meta?: string;
}

const Dashboard = () => {
  const [studies, setStudies] = useState<StudyPlan[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [audits, setAudits] = useState<ScreenshotAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [studiesRes, personasRes, interviewsRes, auditsRes] = await Promise.all([
        supabase
          .from("study_plans")
          .select("*")
          .is("archived_at", null)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("personas")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("interview_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("screenshot_analyses")
          .select("*")
          .order("analyzed_at", { ascending: false })
          .limit(3),
      ]);

      if (studiesRes.data) setStudies(studiesRes.data);
      if (personasRes.data) setPersonas(personasRes.data);
      if (interviewsRes.data) setInterviews(interviewsRes.data);
      if (auditsRes.data) setAudits(auditsRes.data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build activity feed
  const buildActivityFeed = (): ActivityItem[] => {
    const items: ActivityItem[] = [];
    
    studies.forEach(s => items.push({
      id: s.id,
      type: 'study',
      title: s.title,
      date: new Date(s.updated_at),
      meta: s.status
    }));
    
    personas.forEach(p => items.push({
      id: p.id,
      type: 'persona',
      title: p.name,
      date: new Date(p.created_at),
    }));
    
    interviews.forEach(i => items.push({
      id: i.id,
      type: 'interview',
      title: i.participant_name,
      date: new Date(i.created_at),
      meta: i.status
    }));

    audits.forEach(a => items.push({
      id: a.id,
      type: 'audit',
      title: `Design Audit`,
      date: new Date(a.analyzed_at),
      meta: a.score ? `Score: ${a.score}` : undefined
    }));

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);
  };

  const activityFeed = buildActivityFeed();
  const latestStudy = studies[0];
  const hasAnyData = studies.length > 0 || personas.length > 0 || interviews.length > 0 || audits.length > 0;

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'study': return <FileText className="h-4 w-4" />;
      case 'persona': return <UserCircle className="h-4 w-4" />;
      case 'interview': return <Users className="h-4 w-4" />;
      case 'audit': return <Target className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'study': return 'bg-blue-500/10 text-blue-600';
      case 'persona': return 'bg-purple-500/10 text-purple-600';
      case 'interview': return 'bg-green-500/10 text-green-600';
      case 'audit': return 'bg-orange-500/10 text-orange-600';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48 mt-8" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          Your UX research command center
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/50"
          onClick={() => navigate('/research/new-study')}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium">New Study</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-purple-500/5 hover:border-purple-500/50"
          onClick={() => navigate('/research/persona/new')}
        >
          <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <UserCircle className="h-5 w-5 text-purple-600" />
          </div>
          <span className="text-sm font-medium">New Persona</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-orange-500/5 hover:border-orange-500/50"
          onClick={() => navigate('/design-audits')}
        >
          <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-orange-600" />
          </div>
          <span className="text-sm font-medium">Design Audit</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-500/5 hover:border-green-500/50"
          onClick={() => navigate('/screenshot-analysis')}
        >
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-sm font-medium">Screenshot</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{studies.length}</p>
                <p className="text-sm text-muted-foreground">Studies</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{personas.length}</p>
                <p className="text-sm text-muted-foreground">Personas</p>
              </div>
              <UserCircle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{interviews.length}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{audits.length}</p>
                <p className="text-sm text-muted-foreground">Audits</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Study */}
          {latestStudy ? (
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/research/study/${latestStudy.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Continue Research</p>
                    <CardTitle className="text-xl">{latestStudy.title}</CardTitle>
                  </div>
                  <Badge variant={latestStudy.status === 'active' ? 'default' : 'secondary'}>
                    {latestStudy.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {latestStudy.problem_statement}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(latestStudy.updated_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Open <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Start Your First Study</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a research study to organize your UX research
                </p>
                <Button onClick={() => navigate('/research/new-study')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Study
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Audits */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Design Audits</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/design-audits')}>
                View All
              </Button>
            </div>
            {audits.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {audits.slice(0, 3).map((audit) => (
                  <Card 
                    key={audit.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/screenshot-results/${audit.id}`)}
                  >
                    <div className="aspect-video bg-muted relative">
                      <img 
                        src={audit.image_url} 
                        alt="Audit screenshot"
                        className="w-full h-full object-cover"
                      />
                      {audit.score && (
                        <Badge 
                          className={`absolute top-2 right-2 ${
                            audit.score >= 80 ? 'bg-green-500' : 
                            audit.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          } text-white`}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {audit.score}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(audit.analyzed_at), 'MMM d, yyyy')}
                      </p>
                      {audit.violations && Array.isArray(audit.violations) && (
                        <p className="text-sm mt-1">
                          {audit.violations.length} issues found
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No audits yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/design-audits')}>
                    Run Your First Audit
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityFeed.length > 0 ? (
                <div className="space-y-3">
                  {activityFeed.slice(0, 6).map((item) => (
                    <div key={`${item.type}-${item.id}`} className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${getActivityColor(item.type)}`}>
                        {getActivityIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(item.date, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          {!hasAnyData && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    1
                  </div>
                  <p className="text-sm">Create a Study Plan to organize your research goals</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    2
                  </div>
                  <p className="text-sm">Build Personas based on user research</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    3
                  </div>
                  <p className="text-sm">Run Design Audits to find UX issues</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Studies Link */}
          {studies.length > 1 && (
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/research')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">All Studies</p>
                  <p className="text-sm text-muted-foreground">{studies.length} active studies</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
