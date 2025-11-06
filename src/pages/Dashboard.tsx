import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, Sparkles, BarChart3, Calendar, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AnalysisResult {
  id: string;
  score: number;
  analyzed_at: string;
  violations: any;
  screenshot: string;
}

interface WebsiteCrawl {
  id: string;
  overall_score: number;
  completed_at: string;
  aggregate_violations: any;
  status: string;
  total_pages: number;
  analyzed_pages: number;
}

interface Project {
  id: string;
  name: string;
  url: string;
  created_at: string;
  framework: string | null;
  analysis_results: AnalysisResult[];
  website_crawls: WebsiteCrawl[];
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Protected route - handled by ProtectedRoute wrapper in App.tsx
  // No need for manual redirect here

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          analysis_results (
            id,
            score,
            analyzed_at,
            violations,
            screenshot
          ),
          website_crawls (
            id,
            overall_score,
            completed_at,
            aggregate_violations,
            status,
            total_pages,
            analyzed_pages
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects((data as Project[]) || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "The project and its analyses have been removed.",
      });

      loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewAnalysis = (project: Project, analysisId: string, type: 'single' | 'crawl') => {
    if (type === 'single') {
      const analysis = project.analysis_results.find((a) => a.id === analysisId);
      if (!analysis) return;

      navigate("/results", {
        state: {
          analysis: {
            url: project.url,
            websiteName: project.name,
            overallScore: analysis.score,
            violations: analysis.violations,
            strengths: [],
            screenshot: analysis.screenshot,
            framework: project.framework || undefined,
          },
        },
      });
    } else {
      // Multi-page crawl
      navigate("/results", {
        state: {
          crawlId: analysisId,
          analysisType: 'full',
          url: project.url,
        },
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
      <div className="mb-8 sm:mb-12 space-y-2 sm:space-y-3 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
          View and manage your analyzed websites
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur border-2 shadow-2xl animate-fade-in animation-delay-200">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-4 sm:mb-6">
              <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-center">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-6 sm:mb-8 max-w-md text-sm sm:text-base lg:text-lg px-4">
              Start analyzing websites to unlock powerful UX insights and track improvements over time
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/analyze")}
              className="hover-scale text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6"
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Analyze Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 animate-fade-in animation-delay-400">
          {projects.map((project) => {
            // Combine and sort all analyses (both single-page and crawls)
            const singlePageAnalyses = project.analysis_results.map(a => ({
              id: a.id,
              type: 'single' as const,
              score: a.score,
              date: new Date(a.analyzed_at),
            }));

            const crawlAnalyses = (project.website_crawls || [])
              .filter(c => c.status === 'completed')
              .map(c => ({
                id: c.id,
                type: 'crawl' as const,
                score: c.overall_score,
                date: new Date(c.completed_at),
                pages: c.analyzed_pages,
              }));

            const allAnalyses = [...singlePageAnalyses, ...crawlAnalyses].sort(
              (a, b) => b.date.getTime() - a.date.getTime()
            );

            const latestAnalysis = allAnalyses[0];
            const analysisCount = allAnalyses.length;

            return (
              <Card 
                key={project.id} 
                className="bg-card/50 backdrop-blur border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="truncate text-sm sm:text-base mt-1">
                        {new URL(project.url).hostname}
                      </CardDescription>
                    </div>
                    {latestAnalysis && (
                      <Badge className={`${getScoreColor(latestAnalysis.score)} shrink-0 text-sm sm:text-base px-2 sm:px-3 py-1`}>
                        <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {latestAnalysis.score}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <p>
                      {analysisCount} {analysisCount === 1 ? "analysis" : "analyses"}
                    </p>
                    {latestAnalysis && (
                      <>
                        <p>
                          Last analyzed:{" "}
                          {latestAnalysis.date.toLocaleDateString()}
                        </p>
                        {latestAnalysis.type === 'crawl' && 'pages' in latestAnalysis && (
                          <p className="text-primary font-medium">
                            Full site ({latestAnalysis.pages} pages)
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {latestAnalysis && (
                      <>
                        {analysisCount === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover-scale"
                            onClick={() => handleViewAnalysis(project, latestAnalysis.id, latestAnalysis.type)}
                          >
                            <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">View Report</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 hover-scale"
                              >
                                <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">View Report</span>
                                <span className="sm:hidden">View</span>
                                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 sm:w-64 bg-popover z-50">
                              <DropdownMenuLabel className="text-xs sm:text-sm">Select Report Date</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {allAnalyses.map((analysis, index) => (
                                <DropdownMenuItem
                                  key={analysis.id}
                                  onClick={() => handleViewAnalysis(project, analysis.id, analysis.type)}
                                  className="flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                    <span className="text-xs sm:text-sm truncate">
                                      {analysis.date.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </span>
                                    {index === 0 && (
                                      <Badge variant="secondary" className="text-xs shrink-0">Latest</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                    {analysis.type === 'crawl' && 'pages' in analysis && (
                                      <Badge variant="outline" className="text-xs">
                                        {analysis.pages}p
                                      </Badge>
                                    )}
                                    <Badge className={`${getScoreColor(analysis.score)} text-xs`}>
                                      {analysis.score}
                                    </Badge>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0 px-3"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
