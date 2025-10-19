import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HeuristicsSelector } from "@/components/HeuristicsSelector";

const Index = () => {
  const [url, setUrl] = useState("");
  const [heuristics, setHeuristics] = useState<{ set: string; custom?: string[] }>({
    set: "nn_10",
    custom: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();

  // Redirect to auth if not logged in (removed - allowing guest access)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('analyze-website', {
        body: { url }
      });

      if (response.error) {
        throw new Error(response.error.message || "Analysis failed");
      }

      const data = response.data;
      
      if (!data) {
        throw new Error("No data returned from analysis");
      }

      // Save to database only if user is logged in
      if (user) {
        const { data: project } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: data.websiteName || new URL(url).hostname,
            url,
            framework: null, // Framework field kept for backward compatibility
          })
          .select()
          .single();

        if (project) {
          await supabase.from("analysis_results").insert({
            project_id: project.id,
            user_id: user.id,
            score: data.overallScore,
            violations: data.violations,
            screenshot: data.screenshot,
            heuristics: heuristics,
          });
        }

        // Show results immediately
        toast({
          title: "Analysis Complete",
          description: "Viewing your results now.",
        });
        
        navigate("/results", {
          state: {
            analysis: {
              url,
              websiteName: data.websiteName || new URL(url).hostname,
              overallScore: data.overallScore,
              violations: data.violations,
              strengths: data.strengths,
              screenshot: data.screenshot,
              heuristics: heuristics,
              projectId: project?.id,
            },
          },
        });
      } else {
        // Guest user - just show results
        navigate("/results", {
          state: {
            analysis: {
              url,
              websiteName: data.websiteName || new URL(url).hostname,
              overallScore: data.overallScore,
              violations: data.violations,
              strengths: data.strengths,
              screenshot: data.screenshot,
              heuristics: heuristics,
            },
          },
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze website. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-2" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const exampleUrls = [
    "https://amazon.com",
    "https://stripe.com",
    "https://airbnb.com",
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {user ? "Signed In" : "Try Free"} - AI-Powered UX Analysis
              </span>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              UXProbe
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Instantly evaluate any website's usability with AI-powered heuristic analysis based on Nielsen's 10 Usability Heuristics
            </p>
          </div>

      {/* Main Card */}
      <Card className="bg-card/50 backdrop-blur shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Analyze a Website</CardTitle>
          <CardDescription>
            Enter any URL to get a comprehensive usability evaluation with actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingAnalysis />
          ) : (
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="flex-1"
                  />
                  <Button type="submit" size="lg" className="px-8">
                    <Search className="mr-2 h-4 w-4" />
                    Analyze
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <HeuristicsSelector value={heuristics} onChange={setHeuristics} />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  Try these examples:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exampleUrls.map((exampleUrl) => (
                    <Button
                      key={exampleUrl}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUrl(exampleUrl)}
                    >
                      {new URL(exampleUrl).hostname}
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {[
          {
            title: "AI-Powered Analysis",
            description: "Advanced AI evaluates your site against proven UX principles",
          },
          {
            title: "Actionable Insights",
            description: "Get specific recommendations you can implement immediately",
          },
          {
            title: "Instant Results",
            description: "Complete analysis in under 30 seconds",
          },
        ].map((feature, index) => (
          <Card key={index} className="bg-card/30 backdrop-blur border-muted">
            <CardHeader>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
