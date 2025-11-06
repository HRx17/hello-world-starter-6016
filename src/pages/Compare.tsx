import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ArrowLeft, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalysisResult {
  id: string;
  score: number;
  analyzed_at: string;
}

interface WebsiteCrawl {
  id: string;
  overall_score: number;
  completed_at: string;
  status: string;
  analyzed_pages: number;
}

interface Project {
  id: string;
  name: string;
  url: string;
  framework: string | null;
  analysis_results: AnalysisResult[];
  website_crawls: WebsiteCrawl[];
}

interface SelectableAnalysis {
  id: string;
  projectId: string;
  projectName: string;
  url: string;
  score: number;
  date: Date;
  type: 'single' | 'crawl';
  pages?: number;
}

const Compare = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<SelectableAnalysis[]>([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());
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
            id,
            score,
            analyzed_at
          ),
          website_crawls (
            id,
            overall_score,
            completed_at,
            status,
            analyzed_pages
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process all analyses from all projects
      const analyses: SelectableAnalysis[] = [];
      
      (data || []).forEach((project: any) => {
        // Add single-page analyses
        if (project.analysis_results) {
          project.analysis_results.forEach((analysis: AnalysisResult) => {
            analyses.push({
              id: analysis.id,
              projectId: project.id,
              projectName: project.name,
              url: project.url,
              score: analysis.score,
              date: new Date(analysis.analyzed_at),
              type: 'single'
            });
          });
        }

        // Add crawl analyses (only completed ones)
        if (project.website_crawls) {
          project.website_crawls
            .filter((crawl: WebsiteCrawl) => crawl.status === 'completed')
            .forEach((crawl: WebsiteCrawl) => {
              analyses.push({
                id: crawl.id,
                projectId: project.id,
                projectName: project.name,
                url: project.url,
                score: crawl.overall_score,
                date: new Date(crawl.completed_at),
                type: 'crawl',
                pages: crawl.analyzed_pages
              });
            });
        }
      });

      // Sort by date (newest first)
      analyses.sort((a, b) => b.date.getTime() - a.date.getTime());

      setProjects(data as Project[]);
      setAllAnalyses(analyses);
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

  const toggleAnalysis = (analysisId: string) => {
    const newSelected = new Set(selectedAnalyses);
    if (newSelected.has(analysisId)) {
      newSelected.delete(analysisId);
    } else {
      if (newSelected.size >= 5) {
        toast({
          title: "Maximum Reached",
          description: "You can compare up to 5 analyses at once.",
          variant: "destructive",
        });
        return;
      }
      newSelected.add(analysisId);
    }
    setSelectedAnalyses(newSelected);
  };

  const handleCompare = async () => {
    if (selectedAnalyses.size < 2) {
      toast({
        title: "Select More Analyses",
        description: "Please select at least 2 analyses to compare.",
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
      // Get project IDs from selected analyses
      const projectIds = [...new Set(
        allAnalyses
          .filter(a => selectedAnalyses.has(a.id))
          .map(a => a.projectId)
      )];

      const { error } = await supabase.from("comparisons").insert({
        user_id: user!.id,
        name: comparisonName,
        project_ids: projectIds,
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Compare Analyses</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Select 2-5 analyses to compare their UX scores side by side
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

      {allAnalyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 sm:py-16 text-center px-4">
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              No analyses available for comparison
            </p>
            <Button onClick={() => navigate("/")}>Analyze a Website</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
            {allAnalyses.map((analysis) => {
              const isSelected = selectedAnalyses.has(analysis.id);

              return (
                <Card
                  key={analysis.id}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleAnalysis(analysis.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <Checkbox checked={isSelected} className="shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {analysis.projectName}
                          </CardTitle>
                          <CardDescription className="truncate text-xs sm:text-sm mt-1">
                            {new URL(analysis.url).hostname}
                          </CardDescription>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {analysis.date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                            {analysis.type === 'crawl' && analysis.pages && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {analysis.pages} pages
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getScoreColor(analysis.score)} shrink-0 text-xs sm:text-sm px-2 py-0.5`}>
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {analysis.score}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {selectedAnalyses.size} {selectedAnalyses.size === 1 ? "analysis" : "analyses"} selected
            </p>
            <Button
              onClick={handleCompare}
              disabled={selectedAnalyses.size < 2}
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
