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
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-12 space-y-3 animate-fade-in">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          View and manage your analyzed websites
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur border-2 shadow-2xl animate-fade-in animation-delay-200">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-center">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-md text-lg">
              Start analyzing websites to unlock powerful UX insights and track improvements over time
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/analyze")}
              className="hover-scale text-lg px-8 py-6"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Analyze Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 animate-fade-in animation-delay-400">
          {projects.map((project) => {
            const latestAnalysis = project.analysis_results[0];
            const analysisCount = project.analysis_results.length;

            return (
              <Card 
                key={project.id} 
                className="bg-card/50 backdrop-blur border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="truncate text-base">
                        {new URL(project.url).hostname}
                      </CardDescription>
                    </div>
                    {latestAnalysis && (
                      <Badge className={`${getScoreColor(latestAnalysis.score)} shrink-0 text-base px-3 py-1`}>
                        <BarChart3 className="h-4 w-4 mr-1" />
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

                  <div className="flex gap-3">
                    {latestAnalysis && (
                      <Button
                        variant="outline"
                        size="default"
                        className="flex-1 hover-scale"
                        onClick={() => handleViewAnalysis(project, latestAnalysis.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Analysis
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="default"
                      className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
