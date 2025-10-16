import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, Sparkles, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalysisResult {
  id: string;
  score: number;
  analyzed_at: string;
  violations: any;
  screenshot: string;
}

interface Project {
  id: string;
  name: string;
  url: string;
  created_at: string;
  analysis_results: AnalysisResult[];
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

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

  const handleViewAnalysis = (project: Project, analysisId: string) => {
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
        },
      },
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (authLoading || isLoading) {
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          View and manage your analyzed websites
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Start analyzing websites to see them here
            </p>
            <Button onClick={() => navigate("/")}>
              Analyze Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const latestAnalysis = project.analysis_results[0];
            const analysisCount = project.analysis_results.length;

            return (
              <Card key={project.id} className="bg-card/50 backdrop-blur hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <CardDescription className="truncate">
                        {new URL(project.url).hostname}
                      </CardDescription>
                    </div>
                    {latestAnalysis && (
                      <Badge className={`${getScoreColor(latestAnalysis.score)} shrink-0`}>
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {latestAnalysis.score}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {analysisCount} {analysisCount === 1 ? "analysis" : "analyses"}
                    </p>
                    {latestAnalysis && (
                      <p>
                        Last analyzed:{" "}
                        {new Date(latestAnalysis.analyzed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {latestAnalysis && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewAnalysis(project, latestAnalysis.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
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
