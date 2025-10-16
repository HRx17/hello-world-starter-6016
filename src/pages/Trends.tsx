import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";

interface AnalysisData {
  analyzed_at: string;
  score: number;
  violations: any;
}

export default function Trends() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [violationTrends, setViolationTrends] = useState<any[]>([]);
  const [severityDistribution, setSeverityDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchTrendsData();
  }, [projectId]);

  const fetchTrendsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      if (projectError) throw projectError;
      setProjectName(project.name);

      // Fetch all analyses for this project
      const { data: analysesData, error: analysesError } = await supabase
        .from("analysis_results")
        .select("analyzed_at, score, violations")
        .eq("project_id", projectId)
        .order("analyzed_at", { ascending: true });

      if (analysesError) throw analysesError;

      const typedData = (analysesData || []).map(a => ({
        ...a,
        violations: Array.isArray(a.violations) ? a.violations : JSON.parse(a.violations as string)
      }));
      setAnalyses(typedData);
      processAnalysesData(typedData);
    } catch (error: any) {
      console.error("Error fetching trends:", error);
      toast({
        title: "Error",
        description: "Failed to load trends data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalysesData = (data: AnalysisData[]) => {
    // Score trends over time
    const scores = data.map((analysis) => ({
      date: new Date(analysis.analyzed_at).toLocaleDateString(),
      score: analysis.score,
    }));
    setScoreData(scores);

    // Violation count trends
    const violations = data.map((analysis) => ({
      date: new Date(analysis.analyzed_at).toLocaleDateString(),
      total: analysis.violations.length,
      high: analysis.violations.filter((v: any) => v.severity === "high").length,
      medium: analysis.violations.filter((v: any) => v.severity === "medium").length,
      low: analysis.violations.filter((v: any) => v.severity === "low").length,
    }));
    setViolationTrends(violations);

    // Overall severity distribution (latest analysis)
    if (data.length > 0) {
      const latest = data[data.length - 1];
      const distribution = [
        {
          name: "High",
          value: latest.violations.filter((v: any) => v.severity === "high").length,
          color: "#ef4444",
        },
        {
          name: "Medium",
          value: latest.violations.filter((v: any) => v.severity === "medium").length,
          color: "#eab308",
        },
        {
          name: "Low",
          value: latest.violations.filter((v: any) => v.severity === "low").length,
          color: "#3b82f6",
        },
      ].filter(item => item.value > 0);
      setSeverityDistribution(distribution);
    }
  };

  const getScoreTrend = () => {
    if (scoreData.length < 2) return null;
    const latest = scoreData[scoreData.length - 1].score;
    const previous = scoreData[scoreData.length - 2].score;
    const diff = latest - previous;
    
    if (diff > 0) return { icon: TrendingUp, text: `+${diff.toFixed(1)}`, color: "text-green-600" };
    if (diff < 0) return { icon: TrendingDown, text: `${diff.toFixed(1)}`, color: "text-red-600" };
    return { icon: Minus, text: "0", color: "text-muted-foreground" };
  };

  const trend = getScoreTrend();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics & Trends</h1>
              <p className="text-muted-foreground">{projectName}</p>
            </div>
            {trend && (
              <div className={`flex items-center gap-2 ${trend.color}`}>
                <trend.icon className="h-6 w-6" />
                <span className="text-2xl font-bold">{trend.text}</span>
              </div>
            )}
          </div>
        </div>

        {analyses.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No analysis data available yet. Run your first analysis to see trends.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Score Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Usability Score Over Time</CardTitle>
                <CardDescription>Track how your usability score changes with each analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Violation Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Violation Trends</CardTitle>
                <CardDescription>Monitor violations by severity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={violationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="high" fill="#ef4444" name="High" />
                    <Bar dataKey="medium" fill="#eab308" name="Medium" />
                    <Bar dataKey="low" fill="#3b82f6" name="Low" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Current Severity Distribution */}
            {severityDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Severity Distribution</CardTitle>
                  <CardDescription>Breakdown of violations in your latest analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-3xl font-bold text-primary">{analyses.length}</p>
                    <p className="text-sm text-muted-foreground">Total Analyses</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {scoreData.length > 0 ? scoreData[scoreData.length - 1].score.toFixed(1) : "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">Current Score</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {violationTrends.length > 0 ? violationTrends[violationTrends.length - 1].total : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Current Violations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
