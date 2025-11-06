import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ViolationCard } from "@/components/ViolationCard";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { AnnotatedScreenshot } from "@/components/AnnotatedScreenshot";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { MultiPageResults } from "@/components/MultiPageResults";
import { AnalysisResult } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, ExternalLink, Image as ImageIcon, Download, Share2, Mail, Sparkles, UserPlus, Loader2 } from "lucide-react";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Single page analysis
  const analysis = location.state?.analysis as AnalysisResult | undefined;
  
  // Multi-page analysis
  const crawlId = location.state?.crawlId as string | undefined;
  const analysisType = location.state?.analysisType as string | undefined;
  const urlFromState = location.state?.url as string | undefined;
  
  const [crawlData, setCrawlData] = useState<any>(null);
  const [pageAnalyses, setPageAnalyses] = useState<any[]>([]);
  const [isLoadingCrawl, setIsLoadingCrawl] = useState(false);
  
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load multi-page crawl data
  useEffect(() => {
    if (!crawlId || analysisType !== 'full') return;

    const loadCrawlData = async () => {
      setIsLoadingCrawl(true);
      try {
        // Get crawl details
        const { data: crawl, error: crawlError } = await supabase
          .from('website_crawls')
          .select('*')
          .eq('id', crawlId)
          .single();

        if (crawlError) throw crawlError;
        setCrawlData(crawl);

        // Get all page analyses
        const { data: pages, error: pagesError } = await supabase
          .from('page_analyses')
          .select('*')
          .eq('crawl_id', crawlId)
          .order('score', { ascending: false });

        if (pagesError) throw pagesError;
        setPageAnalyses(pages || []);
      } catch (error) {
        console.error('Error loading crawl data:', error);
        toast({
          title: "Error Loading Results",
          description: "Failed to load analysis results",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCrawl(false);
      }
    };

    loadCrawlData();
  }, [crawlId, analysisType, toast]);

  const handleExportPDF = async () => {
    if (!analysis && !crawlData) return;
    setIsExporting(true);
    try {
      const exportData = analysis || {
        websiteName: new URL(crawlData.url).hostname,
        url: crawlData.url,
        overallScore: crawlData.overall_score,
        violations: crawlData.aggregate_violations,
        strengths: crawlData.aggregate_strengths,
      };

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          analysisData: exportData,
          projectName: exportData.websiteName,
        },
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportData.websiteName}-ux-report.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Your UX analysis report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const websiteName = analysis?.websiteName || (crawlData ? new URL(crawlData.url).hostname : '');
    const score = analysis?.overallScore || crawlData?.overall_score;
    
    const shareData = {
      title: `UX Analysis - ${websiteName}`,
      text: `Check out this UX analysis for ${websiteName}. Overall score: ${score}/100`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Share link copied to clipboard",
      });
    }
  };

  const handleEmailReport = () => {
    const websiteName = analysis?.websiteName || (crawlData ? new URL(crawlData.url).hostname : '');
    const url = analysis?.url || crawlData?.url;
    const score = analysis?.overallScore || crawlData?.overall_score;
    const violationCount = analysis?.violations.length || crawlData?.aggregate_violations?.length || 0;

    const subject = encodeURIComponent(`UX Analysis Report - ${websiteName}`);
    const body = encodeURIComponent(
      `Hi,\n\nI've completed a UX analysis for ${websiteName}.\n\n` +
      `Overall Score: ${score}/100\n` +
      `URL: ${url}\n` +
      `Total Violations: ${violationCount}\n\n` +
      `View the full report here: ${window.location.href}\n\n` +
      `Best regards`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  useEffect(() => {
    if (!analysis && !crawlId) {
      navigate("/");
    }
  }, [analysis, crawlId, navigate]);

  if (!analysis && !crawlId) {
    return null;
  }

  // Loading state for multi-page analysis
  if (analysisType === 'full' && isLoadingCrawl) {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg text-muted-foreground">Loading analysis results...</p>
          </div>
        </div>
      </>
    );
  }

  // Render multi-page results
  if (analysisType === 'full' && crawlData) {
    const websiteName = new URL(crawlData.url).hostname;

    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(user ? "/dashboard" : "/")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {user ? "Back to Dashboard" : "Back to Home"}
                </Button>
              
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEmailReport}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Generating..." : "Export"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl font-bold">{websiteName}</h1>
                <div className="flex items-center gap-4">
                  <a
                    href={crawlData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    {crawlData.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Guest User CTA */}
            {!user && (
              <Card className="mb-8 bg-gradient-to-br from-primary via-purple-600 to-primary text-white border-0 shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1">Want to Save These Results?</h3>
                      <p className="text-white/90">
                        Create a free account to save your analyses, track improvements over time, and access advanced features.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      size="lg"
                      variant="secondary"
                      onClick={() => navigate("/auth")}
                      className="flex-1"
                    >
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create Free Account
                    </Button>
                    <Button 
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                    >
                      New Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Multi-page results */}
            <MultiPageResults
              crawl={crawlData}
              pages={pageAnalyses}
              websiteName={websiteName}
            />
          </div>
        </div>
      </>
    );
  }

  // Render single-page results (existing code)
  if (!analysis) {
    return null;
  }

  const violationsBySeverity = {
    high: analysis.violations.filter((v) => v.severity === "high"),
    medium: analysis.violations.filter((v) => v.severity === "medium"),
    low: analysis.violations.filter((v) => v.severity === "low"),
  };

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate(user ? "/dashboard" : "/")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {user ? "Back to Dashboard" : "Back to Home"}
              </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEmailReport}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Generating..." : "Export"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold">{analysis.websiteName}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <a
                href={analysis.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                {analysis.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              {analysis.screenshot && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScreenshotOpen(true)}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  View Full Screenshot
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Guest User CTA */}
        {!user && (
          <Card className="mb-8 bg-gradient-to-br from-primary via-purple-600 to-primary text-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1">Want to Save These Results?</h3>
                  <p className="text-white/90">
                    Create a free account to save your analyses, track improvements over time, and access advanced features like comparisons and PDF exports.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate("/auth")}
                  className="flex-1"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create Free Account
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/analyze")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  New Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Overview */}
        <Card className="mb-8 bg-card/50 backdrop-blur border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Overall Usability Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <ScoreDisplay 
                score={analysis.overallScore} 
                metadata={(analysis as any).metadata}
              />
              
              <div className="flex flex-col justify-center space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-destructive">
                      {violationsBySeverity.high.length}
                    </div>
                    <div className="text-xs text-muted-foreground">High</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {violationsBySeverity.medium.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Medium</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {violationsBySeverity.low.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Low</div>
                  </div>
                </div>
                <div className="text-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {analysis.violations.length} total violations found
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analysis.strengths.length} strengths identified
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annotated Screenshot */}
        {analysis.screenshot && analysis.violations.some(v => v.boundingBox) && (
          <div className="mb-8">
            <AnnotatedScreenshot
              screenshot={analysis.screenshot}
              violations={analysis.violations}
              websiteName={analysis.websiteName}
            />
          </div>
        )}

        {/* Violations */}
        {analysis.violations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Usability Violations</h2>
            <div className="space-y-4">
              {["high", "medium", "low"].map((severity) => {
                const items = violationsBySeverity[severity as keyof typeof violationsBySeverity];
                if (items.length === 0) return null;

                return (
                  <div key={severity}>
                    <h3 className="text-lg font-semibold mb-3 capitalize">
                      {severity} Priority ({items.length})
                    </h3>
                    <div className="space-y-3">
                      {items.map((violation, index) => {
                        // Calculate global violation number across all severities
                        const violationNumber = analysis.violations
                          .filter(v => v.boundingBox)
                          .findIndex(v => v === violation) + 1;
                        
                        return (
                          <ViolationCard 
                            key={index} 
                            violation={violation}
                            violationNumber={violationNumber > 0 ? violationNumber : undefined}
                            framework={analysis.framework}
                            url={analysis.url}
                            screenshot={analysis.screenshot}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">What This Website Does Well</h2>
            <Card className="bg-green-500/10 border-green-500">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {analysis.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium">{strength.heuristic}</p>
                        <p className="text-sm text-muted-foreground">{strength.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Screenshot Viewer Modal */}
        {analysis.screenshot && (
          <ScreenshotViewer
            screenshot={analysis.screenshot}
            websiteName={analysis.websiteName}
            isOpen={isScreenshotOpen}
            onClose={() => setIsScreenshotOpen(false)}
          />
        )}
      </div>
    </div>
    </>
  );
};

export default Results;
