import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { CrawlProgressCard } from "@/components/CrawlProgressCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles, Globe } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HeuristicsSelector } from "@/components/HeuristicsSelector";

const Index = () => {
  const [url, setUrl] = useState("");
  const [analysisType, setAnalysisType] = useState<"single" | "full">("single");
  const [heuristics, setHeuristics] = useState<{ set: string; custom?: string[] }>({
    set: "nn_10",
    custom: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<any>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();

  // Block navigation during analysis
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLoading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoading]);

  const handleTerminateAnalysis = useCallback(() => {
    setIsLoading(false);
    setCrawlId(null);
    setCrawlStatus(null);
    
    toast({
      title: "Analysis Terminated",
      description: "The analysis has been stopped",
      variant: "destructive",
    });
  }, [toast]);

  const handleNavigationAttempt = useCallback((path: string) => {
    if (isLoading) {
      setPendingNavigation(path);
      setShowExitDialog(true);
    } else {
      navigate(path);
    }
  }, [isLoading, navigate]);

  const confirmExit = useCallback(() => {
    handleTerminateAnalysis();
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowExitDialog(false);
    setPendingNavigation(null);
  }, [handleTerminateAnalysis, navigate, pendingNavigation]);

  // Poll crawl status
  useEffect(() => {
    if (!crawlId || !isLoading) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-crawl-status', {
          body: { crawlId }
        });

        if (error) throw error;

        setCrawlStatus(data);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setIsLoading(false);
          
          toast({
            title: "Analysis Complete",
            description: `Successfully analyzed ${data.analyzed_pages} pages`,
          });

          // Navigate to results with crawl ID
          navigate("/results", {
            state: {
              crawlId,
              analysisType: 'full',
              url,
            },
          });
        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setIsLoading(false);
          toast({
            title: "Analysis Failed",
            description: "An error occurred during analysis",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [crawlId, isLoading, navigate, toast, url]);

  const handleSinglePageAnalyze = async () => {
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
            framework: null,
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
      throw error;
    }
  };

  const handleFullWebsiteAnalyze = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('start-website-crawl', {
        body: {
          url,
          userId: user?.id || null,
          projectId: null,
        }
      });

      if (error) throw error;

      setCrawlId(data.crawlId);
      
      toast({
        title: "Crawl Started",
        description: "Discovering and analyzing all pages...",
      });
    } catch (error) {
      console.error("Crawl error:", error);
      throw error;
    }
  };

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
    setCrawlId(null);
    setCrawlStatus(null);

    try {
      if (analysisType === "single") {
        await handleSinglePageAnalyze();
      } else {
        await handleFullWebsiteAnalyze();
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze website. Please try again.",
        variant: "destructive",
      });
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
    <DashboardLayout onNavigate={isLoading ? handleNavigationAttempt : undefined}>
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
            crawlId ? (
              <CrawlProgressCard
                status={crawlStatus?.status || 'queued'}
                totalPages={crawlStatus?.total_pages || 0}
                crawledPages={crawlStatus?.crawled_pages || 0}
                analyzedPages={crawlStatus?.analyzed_pages || 0}
                estimatedTimeRemaining={
                  crawlStatus?.metadata?.estimated_time_remaining 
                    ? `${Math.floor(crawlStatus.metadata.estimated_time_remaining / 60)}m ${crawlStatus.metadata.estimated_time_remaining % 60}s`
                    : undefined
                }
              />
            ) : (
              <LoadingAnalysis />
            )
          ) : (
            <form onSubmit={handleAnalyze} className="space-y-6">
              {/* Analysis Type Selector */}
              <div className="space-y-3">
                <Label>Analysis Type</Label>
                <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as "single" | "full")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Single Page
                    </TabsTrigger>
                    <TabsTrigger value="full" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Full Website
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Analyze a single page quickly. Perfect for testing specific pages or features.
                    </p>
                  </TabsContent>
                  <TabsContent value="full" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Crawl and analyze your entire website (up to 100 pages). Multi-model AI ensemble for 95%+ accuracy.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

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
                    {analysisType === "single" ? (
                      <><Search className="mr-2 h-4 w-4" />Analyze</>
                    ) : (
                      <><Globe className="mr-2 h-4 w-4" />Crawl & Analyze</>
                    )}
                  </Button>
                </div>
              </div>

              {analysisType === "single" && (
                <div className="space-y-4 pt-4 border-t">
                  <HeuristicsSelector value={heuristics} onChange={setHeuristics} />
                </div>
              )}

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

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              The analysis is currently in progress. Leaving this page will terminate the analysis. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay on Page</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Terminate & Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Index;
