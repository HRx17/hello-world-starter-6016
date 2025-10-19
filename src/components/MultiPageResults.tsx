import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ViolationCard } from "@/components/ViolationCard";
import { CheckCircle2, FileText, AlertTriangle } from "lucide-react";

interface PageAnalysis {
  id: string;
  page_url: string;
  page_title: string;
  page_type: string;
  score: number;
  violations: any[];
  strengths: any[];
  screenshot?: string;
}

interface WebsiteCrawl {
  id: string;
  url: string;
  overall_score: number;
  total_pages: number;
  analyzed_pages: number;
  aggregate_violations: any[];
  aggregate_strengths: any[];
  status: string;
}

interface MultiPageResultsProps {
  crawl: WebsiteCrawl;
  pages: PageAnalysis[];
  websiteName: string;
}

export const MultiPageResults = ({ crawl, pages, websiteName }: MultiPageResultsProps) => {
  const violationsBySeverity = {
    high: crawl.aggregate_violations?.filter((v) => v.severity === "high") || [],
    medium: crawl.aggregate_violations?.filter((v) => v.severity === "medium") || [],
    low: crawl.aggregate_violations?.filter((v) => v.severity === "low") || [],
  };

  const pagesByType = pages.reduce((acc, page) => {
    const type = page.page_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(page);
    return acc;
  }, {} as Record<string, PageAnalysis[]>);

  return (
    <div className="space-y-8">
      {/* Overall Score */}
      <Card className="bg-card/50 backdrop-blur border-2 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Overall Website Score</CardTitle>
          <CardDescription>
            Based on analysis of {crawl.analyzed_pages} pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <ScoreDisplay score={crawl.overall_score} />
            
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
                  {crawl.aggregate_violations?.length || 0} unique violations found
                </div>
                <div className="text-sm text-muted-foreground">
                  {crawl.aggregate_strengths?.length || 0} strengths identified
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aggregate Violations */}
      {crawl.aggregate_violations && crawl.aggregate_violations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Site-Wide Issues</h2>
          <div className="space-y-4">
            {["high", "medium", "low"].map((severity) => {
              const items = violationsBySeverity[severity as keyof typeof violationsBySeverity];
              if (items.length === 0) return null;

              return (
                <div key={severity}>
                  <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {severity} Priority ({items.length})
                  </h3>
                  <div className="space-y-3">
                    {items.map((violation, index) => (
                      <ViolationCard 
                        key={index} 
                        violation={violation}
                        framework={undefined}
                        url={crawl.url}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Page-by-Page Breakdown */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Page-by-Page Analysis</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">
              All Pages ({pages.length})
            </TabsTrigger>
            {Object.entries(pagesByType).map(([type, typePages]) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type} ({typePages.length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {pages.map((page) => (
              <PageAnalysisCard key={page.id} page={page} />
            ))}
          </TabsContent>

          {Object.entries(pagesByType).map(([type, typePages]) => (
            <TabsContent key={type} value={type} className="space-y-4 mt-6">
              {typePages.map((page) => (
                <PageAnalysisCard key={page.id} page={page} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Strengths */}
      {crawl.aggregate_strengths && crawl.aggregate_strengths.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">What This Website Does Well</h2>
          <Card className="bg-green-500/10 border-green-500">
            <CardContent className="pt-6">
              <div className="space-y-3">
                {crawl.aggregate_strengths.map((strength, index) => (
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
    </div>
  );
};

const PageAnalysisCard = ({ page }: { page: PageAnalysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{page.page_title || 'Untitled'}</span>
            </CardTitle>
            <CardDescription className="truncate">
              {page.page_url}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-3xl font-bold ${getScoreColor(page.score)}`}>
              {page.score}
            </div>
            <Badge variant="secondary" className="capitalize">
              {page.page_type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {page.violations && page.violations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Issues Found ({page.violations.length})
              </h4>
              <div className="space-y-2">
                {page.violations.slice(0, 3).map((violation, idx) => (
                  <div key={idx} className="text-sm p-3 rounded bg-muted/50">
                    <div className="flex items-start gap-2">
                      <Badge 
                        variant={
                          violation.severity === 'high' ? 'destructive' : 
                          violation.severity === 'medium' ? 'default' : 
                          'secondary'
                        }
                        className="mt-0.5"
                      >
                        {violation.severity}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{violation.title}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {violation.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {page.violations.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{page.violations.length - 3} more issues
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
