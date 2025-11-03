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
  const [crawlMode, setCrawlMode] = useState<"quick" | "light" | "standard" | "comprehensive">("light");
  const [useBasicCrawl, setUseBasicCrawl] = useState(false);
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

  // Poll crawl status with timeout detection and auto-restart
  useEffect(() => {
    if (!crawlId || !isLoading) return;
    
    console.log('🔄 [FRONTEND] Starting crawl status polling for ID:', crawlId);

    let pollCount = 0;
    let lastProgress = 0;
    let stuckCounter = 0;
    const MAX_STUCK_ITERATIONS = 10; // If no progress for 30s (10 * 3s), restart
    const MAX_POLL_COUNT = 400; // Max 20 minutes (400 * 3s)

    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        console.log(`🔍 [FRONTEND] Poll #${pollCount} - Checking crawl status...`);

        // Timeout check - 20 minutes max
        if (pollCount > MAX_POLL_COUNT) {
          console.error('❌ [FRONTEND] Polling timeout after', MAX_POLL_COUNT * 3, 'seconds');
          clearInterval(pollInterval);
          setIsLoading(false);
          toast({
            title: "Analysis Timeout",
            description: "Analysis took too long. Please try with a lighter crawl mode.",
            variant: "destructive",
          });
          return;
        }

        console.log('📡 [FRONTEND] Invoking check-crawl-status...');
        const { data, error } = await supabase.functions.invoke('check-crawl-status', {
          body: { crawlId }
        });

        if (error) {
          console.error('❌ [FRONTEND] Status check error:', error);
          stuckCounter++;
          
          // Only stop after many consecutive failures (not auto-restart)
          if (stuckCounter > 10) {
            console.error('❌ [FRONTEND] Too many consecutive failures:', stuckCounter);
            clearInterval(pollInterval);
            setIsLoading(false);
            toast({
              title: "Connection Error",
              description: "Unable to check crawl status. Please refresh and try again.",
              variant: "destructive",
            });
          }
          return;
        }
        
        console.log('📊 [FRONTEND] Crawl status received:', {
          status: data?.status,
          crawled: data?.crawled_pages,
          analyzed: data?.analyzed_pages,
          total: data?.total_pages
        });
        
        // Check if backend signals a restart is needed (only on actual errors)
        if (data?.should_restart) {
          console.log('🔄 [FRONTEND] Backend signaled restart needed due to error');
          await handleAutoRestart();
          return;
        }

        setCrawlStatus(data);

        // Reset stuck counter on successful status check
        stuckCounter = 0;
        
        // Update progress tracking (but don't auto-restart on lack of progress)
        const currentProgress = (data.crawled_pages || 0) + (data.analyzed_pages || 0);
        if (currentProgress !== lastProgress) {
          console.log('📈 [FRONTEND] Progress updated:', lastProgress, '->', currentProgress);
          lastProgress = currentProgress;
        }

        if (data.status === 'completed') {
          console.log('✅ [FRONTEND] Crawl completed successfully!');
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
          console.error('❌ [FRONTEND] Crawl failed with error:', data.error_message);
          clearInterval(pollInterval);
          setIsLoading(false);
          toast({
            title: "Analysis Failed",
            description: data.error_message || "An error occurred during analysis. You can try again with a lighter crawl mode.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Status check exception:', error);
        stuckCounter++;
        
        // Only show error after multiple consecutive failures
        if (stuckCounter > 5) {
          console.error('❌ [FRONTEND] Too many consecutive check failures');
          clearInterval(pollInterval);
          setIsLoading(false);
          toast({
            title: "Connection Error",
            description: "Unable to check crawl status. Please refresh and try again.",
            variant: "destructive",
          });
        }
      }
    }, 3000); // Poll every 3 seconds
    
    console.log('⏱️ [FRONTEND] Poll interval started (every 3 seconds)');

    // Auto-restart function
    async function handleAutoRestart() {
      console.log('🔄 [FRONTEND] Executing auto-restart...');
      clearInterval(pollInterval);
      
      toast({
        title: "Auto-Recovery",
        description: "Crawl got stuck. Attempting automatic restart...",
      });

      try {
        console.log('🔄 [FRONTEND] Marking old crawl as error...');
        // Mark old crawl as error
        await supabase
          .from('website_crawls')
          .update({ status: 'error', metadata: { error: 'Auto-restarted due to timeout' } })
          .eq('id', crawlId);

        console.log('⏱️ [FRONTEND] Waiting 2 seconds before restart...');
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('🚀 [FRONTEND] Restarting crawl...');
        // Restart the crawl
        await handleFullWebsiteAnalyze();
        
        console.log('✅ [FRONTEND] Auto-restart successful');
        toast({
          title: "Restarted",
          description: "Analysis restarted with fresh crawl",
        });
      } catch (error) {
        console.error('❌ [FRONTEND] Auto-restart failed:', error);
        setIsLoading(false);
        toast({
          title: "Restart Failed",
          description: "Unable to restart automatically. Please try manually.",
          variant: "destructive",
        });
      }
    }

    return () => {
      console.log('🛑 [FRONTEND] Cleaning up poll interval');
      clearInterval(pollInterval);
    };
  }, [crawlId, isLoading, navigate, toast, url]);

  // Normalize URL for consistent project matching
  const normalizeUrl = (urlString: string): string => {
    try {
      const urlObj = new URL(urlString);
      // Remove trailing slash, lowercase hostname
      return `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${urlObj.pathname.replace(/\/$/, '')}`;
    } catch {
      return urlString;
    }
  };

  // Find or create project for a URL
  const findOrCreateProject = async (urlString: string): Promise<string | null> => {
    if (!user) return null;
    
    const normalized = normalizeUrl(urlString);
    
    // Try to find existing project with this URL
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("id, url")
      .eq("user_id", user.id);
    
    // Check if any existing project matches (normalized comparison)
    const existingProject = existingProjects?.find(p => normalizeUrl(p.url) === normalized);
    
    if (existingProject) {
      return existingProject.id;
    }
    
    // Create new project
    const { data: newProject } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: new URL(urlString).hostname,
        url: urlString,
        framework: null,
      })
      .select()
      .single();
    
    return newProject?.id || null;
  };

  const handleSinglePageAnalyze = async () => {
    try {
      console.log('🚀 [FRONTEND] Starting single-page analysis for:', url);
      console.log('📊 [FRONTEND] Using heuristics:', heuristics);
      
      const response = await supabase.functions.invoke('analyze-website', {
        body: { url }
      });

      console.log('📥 [FRONTEND] Received response from backend:', response);

      if (response.error) {
        console.error('❌ [FRONTEND] Backend error:', response.error);
        throw new Error(response.error.message || "Analysis failed");
      }

      const data = response.data;
      console.log('✅ [FRONTEND] Analysis data received:', {
        score: data?.overallScore,
        violations: data?.violations?.length,
        strengths: data?.strengths?.length,
        screenshot: !!data?.screenshot
      });
      
      if (!data) {
        throw new Error("No data returned from analysis");
      }

      // Save to database only if user is logged in
      if (user) {
        console.log('💾 [FRONTEND] Saving results to database for user:', user.id);
        const projectId = await findOrCreateProject(url);

        if (projectId) {
          console.log('📝 [FRONTEND] Inserting analysis result for project:', projectId);
          await supabase.from("analysis_results").insert({
            project_id: projectId,
            user_id: user.id,
            score: data.overallScore,
            violations: data.violations,
            screenshot: data.screenshot,
            heuristics: heuristics,
          });
          console.log('✅ [FRONTEND] Analysis saved to database');
        }

        console.log('🔄 [FRONTEND] Navigating to results page');
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
              projectId: projectId,
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
      console.error("❌ [FRONTEND] Analysis error:", error);
      console.error("❌ [FRONTEND] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const handleBasicCrawl = async () => {
    try {
      console.log('🚀 [FRONTEND] Starting basic crawl for:', url);
      console.log('📊 [FRONTEND] Crawl mode:', crawlMode);
      
      const maxPages = crawlMode === 'quick' ? 10 : crawlMode === 'light' ? 25 : crawlMode === 'standard' ? 50 : 100;
      console.log('📄 [FRONTEND] Max pages to crawl:', maxPages);
      
      // Find or create project before starting crawl
      console.log('🔍 [FRONTEND] Finding or creating project...');
      const projectId = await findOrCreateProject(url);
      console.log('✅ [FRONTEND] Project ID:', projectId);
      
      console.log('📡 [FRONTEND] Invoking crawl-website-basic edge function...');
      const { data, error } = await supabase.functions.invoke('crawl-website-basic', {
        body: {
          url,
          maxPages,
          userId: user?.id || null,
          projectId: projectId,
        }
      });

      console.log('📥 [FRONTEND] Crawl response:', { success: data?.success, error });

      if (error) {
        console.error('❌ [FRONTEND] Crawl error:', error);
        throw error;
      }

      if (!data.success) {
        console.error('❌ [FRONTEND] Crawl failed:', data.error);
        toast({
          title: "Crawl Failed",
          description: data.error || "Failed to crawl website",
          variant: "destructive",
        });
        return;
      }

      // If basic crawl returned pages, set crawl ID for status checking
      if (data.crawlId) {
        console.log('✅ [FRONTEND] Crawl started with ID:', data.crawlId);
        setCrawlId(data.crawlId);
        toast({
          title: "Free Crawl Started",
          description: `Analyzing ${data.totalPages} pages (no screenshots, simple HTML only)`,
        });
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Basic crawl error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });
    }
  };

  const handleFullWebsiteAnalyze = async () => {
    try {
      console.log('🚀 [FRONTEND] Starting full website crawl for:', url);
      console.log('📊 [FRONTEND] Crawl mode:', crawlMode);
      
      // Find or create project before starting crawl
      console.log('🔍 [FRONTEND] Finding or creating project...');
      const projectId = await findOrCreateProject(url);
      console.log('✅ [FRONTEND] Project ID:', projectId);
      
      console.log('📡 [FRONTEND] Invoking start-website-crawl edge function...');
      const { data, error } = await supabase.functions.invoke('start-website-crawl', {
        body: {
          url,
          userId: user?.id || null,
          projectId: projectId,
          crawlMode,
        }
      });

      console.log('📥 [FRONTEND] Crawl response:', { success: data?.success, crawlId: data?.crawlId, error });

      if (error) {
        console.error('❌ [FRONTEND] Crawl error:', error);
        
        // Handle specific error types
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          console.error('❌ [FRONTEND] Rate limit error detected');
          toast({
            title: "Rate Limit Reached",
            description: "Firecrawl API rate limit exceeded. Please wait 5-10 minutes and try again.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message?.includes('credits') || error.message?.includes('402')) {
          console.error('❌ [FRONTEND] Insufficient credits error detected');
          toast({
            title: "Insufficient Credits",
            description: error.message || "Not enough Firecrawl credits. Try a lighter crawl mode or upgrade your plan.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      if (!data.success) {
        console.error('❌ [FRONTEND] Crawl failed:', data.error, 'Code:', data.errorCode);
        
        // Handle specific error codes from edge function
        if (data.errorCode === 'INSUFFICIENT_CREDITS') {
          toast({
            title: "Insufficient Credits",
            description: data.error || "Not enough Firecrawl credits. Try a lighter crawl mode.",
            variant: "destructive",
          });
          return;
        }
        
        if (data.errorCode === 'RATE_LIMIT') {
          toast({
            title: "Rate Limit Reached",
            description: data.error || "Please wait 5-10 minutes and try again.",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Crawl Failed",
          description: data.error || "Failed to start website crawl",
          variant: "destructive",
        });
        return;
      }

      setCrawlId(data.crawlId);
      console.log('✅ [FRONTEND] Crawl started successfully with ID:', data.crawlId);
      
      toast({
        title: "Crawl Started",
        description: "Discovering and analyzing all pages...",
      });
    } catch (error) {
      console.error("❌ [FRONTEND] Crawl error:", error);
      console.error("❌ [FRONTEND] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 [FRONTEND] Form submitted - Starting analysis flow');
    console.log('📋 [FRONTEND] Analysis type:', analysisType);
    console.log('🌐 [FRONTEND] URL:', url);
    
    // Basic URL validation
    try {
      new URL(url);
      console.log('✅ [FRONTEND] URL validation passed');
    } catch {
      console.error('❌ [FRONTEND] Invalid URL format');
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
      console.log('🎯 [FRONTEND] Form submitted - Starting analysis flow');
      console.log('📋 [FRONTEND] Analysis type:', analysisType);
      console.log('🌐 [FRONTEND] URL:', url);
      
      if (analysisType === "single") {
        console.log('➡️ [FRONTEND] Executing single-page analysis');
        await handleSinglePageAnalyze();
      } else if (useBasicCrawl) {
        console.log('➡️ [FRONTEND] Executing basic crawl');
        await handleBasicCrawl();
      } else {
        console.log('➡️ [FRONTEND] Executing full website crawl');
        await handleFullWebsiteAnalyze();
      }
      console.log('✅ [FRONTEND] Analysis/Crawl initiated successfully');
    } catch (error) {
      console.error('❌ [FRONTEND] Analysis failed:', error);
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
                {user ? "" : "Try Free"} - AI-Powered UX Analysis
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
                estimatedTimeRemaining={crawlStatus?.metadata?.estimated_time_remaining}
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
                  <TabsContent value="full" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Crawl and analyze your entire website. Multi-model AI ensemble for 95%+ accuracy.
                    </p>
                    
                    {/* Crawl Mode Selector */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label>Crawl Intensity</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCrawlMode('quick')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            crawlMode === 'quick'
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-sm">Quick Scan</div>
                          <div className="text-xs text-muted-foreground mt-1">25 pages • ~30 credits</div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCrawlMode('light')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            crawlMode === 'light'
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-sm flex items-center gap-1">
                            Light <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Recommended</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {useBasicCrawl ? '25 pages • Free' : '50 pages • ~60 credits'}
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCrawlMode('standard')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            crawlMode === 'standard'
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-sm">Standard</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {useBasicCrawl ? '50 pages • Free' : '150 pages • ~180 credits'}
                          </div>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setCrawlMode('comprehensive')}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            crawlMode === 'comprehensive'
                              ? 'border-primary bg-primary/5'
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-sm">Comprehensive</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {useBasicCrawl ? '100 pages • Free' : '500 pages • ~600 credits'}
                          </div>
                        </button>
                      </div>
                      
                      {crawlMode === 'comprehensive' && !useBasicCrawl && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ Comprehensive mode requires significant Firecrawl credits. Ensure you have enough credits before proceeding.
                          </p>
                        </div>
                      )}

                      {useBasicCrawl && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mt-2">
                          <p className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-1">
                            ⚠️ Limitations of Free Basic Crawl:
                          </p>
                          <ul className="text-xs text-orange-600 dark:text-orange-500 space-y-0.5">
                            <li>• Won't work on JavaScript-heavy sites (SPAs)</li>
                            <li>• No screenshots for visual analysis</li>
                            <li>• May be blocked by anti-bot systems</li>
                            <li>• Best for simple HTML/CSS websites</li>
                          </ul>
                        </div>
                      )}
                    </div>
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
