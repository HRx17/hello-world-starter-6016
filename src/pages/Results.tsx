import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ViolationCard } from "@/components/ViolationCard";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { AnalysisResult } from "@/lib/types";
import { ArrowLeft, CheckCircle2, ExternalLink, Image as ImageIcon } from "lucide-react";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = location.state?.analysis as AnalysisResult | undefined;
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);

  useEffect(() => {
    if (!analysis) {
      navigate("/");
    }
  }, [analysis, navigate]);

  if (!analysis) {
    return null;
  }

  const violationsBySeverity = {
    high: analysis.violations.filter((v) => v.severity === "high"),
    medium: analysis.violations.filter((v) => v.severity === "medium"),
    low: analysis.violations.filter((v) => v.severity === "low"),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Analyze Another Website
          </Button>

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

        {/* Score Overview */}
        <Card className="mb-8 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Overall Usability Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <ScoreDisplay score={analysis.overallScore} />
              
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
                      {items.map((violation, index) => (
                        <ViolationCard 
                          key={index} 
                          violation={violation}
                          screenshot={analysis.screenshot}
                          onViewScreenshot={() => setIsScreenshotOpen(true)}
                        />
                      ))}
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
  );
};

export default Results;
