import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ViolationCard } from "@/components/ViolationCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScreenshotResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['screenshot-analysis', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screenshot_analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'major':
        return <AlertTriangle className="h-4 w-4" />;
      case 'minor':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'major':
        return 'default';
      case 'minor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full mb-6" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analysis) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Analysis not found</h2>
          <Button onClick={() => navigate('/screenshot-analysis')}>
            Back to Screenshot Analysis
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const violations = (analysis.violations as any[]) || [];
  const strengths = (analysis.strengths as any[]) || [];

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/screenshot-analysis')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Screenshot Analysis Results</h1>
          <p className="text-muted-foreground">
            Analyzed on {new Date(analysis.analyzed_at || analysis.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Score Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <ScoreDisplay score={analysis.score || 0} />
                <div className="mt-4 flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Violations:</span>
                    <span className="ml-2 font-semibold">{violations.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Strengths:</span>
                    <span className="ml-2 font-semibold">{strengths.length}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 max-w-md ml-8">
                <img
                  src={analysis.image_url}
                  alt="Analyzed design"
                  className="w-full rounded-lg border border-border shadow-lg"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Violations and Strengths */}
        <Tabs defaultValue="violations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="violations">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Violations ({violations.length})
            </TabsTrigger>
            <TabsTrigger value="strengths">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Strengths ({strengths.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="violations" className="space-y-4 mt-6">
            {violations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-semibold">No violations found!</p>
                  <p className="text-muted-foreground">Your design follows all selected heuristics</p>
                </CardContent>
              </Card>
            ) : (
              violations.map((violation, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityColor(violation.severity) as any}>
                            {getSeverityIcon(violation.severity)}
                            <span className="ml-1 capitalize">{violation.severity}</span>
                          </Badge>
                          <Badge variant="outline">{violation.heuristic?.replace(/_/g, ' ')}</Badge>
                        </div>
                        <CardTitle className="text-xl">{violation.title}</CardTitle>
                        {violation.location && (
                          <CardDescription className="mt-1">
                            📍 {violation.location}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Issue:</h4>
                      <p className="text-muted-foreground">{violation.description}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Recommendation:</h4>
                      <p className="text-muted-foreground">{violation.suggestion}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="strengths" className="space-y-4 mt-6">
            {strengths.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold">No specific strengths identified</p>
                  <p className="text-muted-foreground">Focus on addressing the violations above</p>
                </CardContent>
              </Card>
            ) : (
              strengths.map((strength, index) => (
                <Card key={index} className="border-green-500/20 bg-green-50/5">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <Badge variant="outline" className="border-green-500/50">
                        {strength.heuristic?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{strength.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{strength.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}