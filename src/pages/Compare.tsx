import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  url: string;
  framework: string | null;
  analysis_results: {
    score: number;
    analyzed_at: string;
  }[];
}

const Compare = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [comparisonName, setComparisonName] = useState("");
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
          id,
          name,
          url,
          framework,
          analysis_results (
            score,
            analyzed_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Only show projects that have at least one analysis
      const projectsWithAnalysis = (data || []).filter(
        (p: any) => p.analysis_results && p.analysis_results.length > 0
      );

      setProjects(projectsWithAnalysis as Project[]);
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

  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      if (newSelected.size >= 5) {
        toast({
          title: "Maximum Reached",
          description: "You can compare up to 5 projects at once.",
          variant: "destructive",
        });
        return;
      }
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleCompare = async () => {
    if (selectedProjects.size < 2) {
      toast({
        title: "Select More Projects",
        description: "Please select at least 2 projects to compare.",
        variant: "destructive",
      });
      return;
    }

    if (!comparisonName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for this comparison.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("comparisons").insert({
        user_id: user!.id,
        name: comparisonName,
        project_ids: Array.from(selectedProjects),
      });

      if (error) throw error;

      toast({
        title: "Comparison Created",
        description: "Your comparison has been saved successfully.",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating comparison:", error);
      toast({
        title: "Error",
        description: "Failed to create comparison. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getLatestScore = (project: Project) => {
    if (!project.analysis_results || project.analysis_results.length === 0) return null;
    return project.analysis_results[0].score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (authLoading || isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard")}
        className="mb-4 sm:mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="mb-6 sm:mb-8 space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Compare Projects</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Select 2-5 projects to compare their UX scores side by side
        </p>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Comparison Name</CardTitle>
          <CardDescription className="text-sm">
            Give this comparison a descriptive name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g., Homepage Redesign Comparison"
            value={comparisonName}
            onChange={(e) => setComparisonName(e.target.value)}
            className="text-sm sm:text-base"
          />
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 sm:py-16 text-center px-4">
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              No analyzed projects available for comparison
            </p>
            <Button onClick={() => navigate("/")}>Analyze a Website</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
            {projects.map((project) => {
              const score = getLatestScore(project);
              const isSelected = selectedProjects.has(project.id);

              return (
                <Card
                  key={project.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleProject(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <Checkbox checked={isSelected} className="shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="truncate text-xs sm:text-sm mt-1">
                            {new URL(project.url).hostname}
                          </CardDescription>
                        </div>
                      </div>
                      {score !== null && (
                        <Badge className={`${getScoreColor(score)} shrink-0 text-xs sm:text-sm px-2 py-0.5`}>
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {score}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  {project.framework && (
                    <CardContent className="pt-0">
                      <Badge variant="outline" className="text-xs">{project.framework}</Badge>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {selectedProjects.size} project{selectedProjects.size !== 1 ? "s" : ""} selected
            </p>
            <Button
              onClick={handleCompare}
              disabled={selectedProjects.size < 2}
              size="lg"
              className="w-full sm:w-auto"
            >
              Create Comparison
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Compare;
