import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ViolationCard } from "@/components/ViolationCard";
import { CheckCircle2, FileText, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnotatedScreenshot } from "@/components/AnnotatedScreenshot";
import { useState } from "react";

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

          <TabsContent value="all" className="mt-6">
            <PageCarousel pages={pages} />
          </TabsContent>

          {Object.entries(pagesByType).map(([type, typePages]) => (
            <TabsContent key={type} value={type} className="mt-6">
              <PageCarousel pages={typePages} />
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

const PageCarousel = ({ pages }: { pages: PageAnalysis[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < pages.length - 1 ? prev + 1 : 0));
  };

  if (pages.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No pages found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Carousel Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={pages.length <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {currentIndex + 1} of {pages.length}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={pages.length <= 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Current Page Card */}
      <PageAnalysisCard page={pages[currentIndex]} />

      {/* Dot Navigation */}
      {pages.length > 1 && (
        <div className="flex justify-center gap-2 py-2">
          {pages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to page ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PageAnalysisCard = ({ page }: { page: PageAnalysis }) => {
  const [showAllViolations, setShowAllViolations] = useState(false);
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const violationsWithBoundingBoxes = page.violations?.filter(v => v.boundingBox) || [];
  const displayViolations = showAllViolations ? page.violations : page.violations?.slice(0, 3);

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
        <div className="space-y-6">
          {/* Screenshot with or without Annotations */}
          {page.screenshot && (
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              {violationsWithBoundingBoxes.length > 0 ? (
                <AnnotatedScreenshot
                  screenshot={page.screenshot}
                  violations={violationsWithBoundingBoxes}
                  websiteName={page.page_title || 'Page'}
                />
              ) : (
                <img 
                  src={page.screenshot} 
                  alt={`Screenshot of ${page.page_title}`}
                  className="w-full h-auto"
                />
              )}
            </div>
          )}

          {/* Violations List */}
          {page.violations && page.violations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">
                Issues Found ({page.violations.length})
              </h4>
              <div className="space-y-2">
                {displayViolations?.map((violation, idx) => (
                  <div key={idx} className="text-sm p-3 rounded bg-muted/50 border">
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
                        {violation.location && (
                          <p className="text-muted-foreground text-xs mt-1">
                            📍 {violation.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {page.violations.length > 3 && !showAllViolations && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllViolations(true)}
                    className="w-full"
                  >
                    Show {page.violations.length - 3} more issues
                  </Button>
                )}
                {showAllViolations && page.violations.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllViolations(false)}
                    className="w-full"
                  >
                    Show less
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Strengths */}
          {page.strengths && page.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 text-green-700 dark:text-green-400">
                Strengths ({page.strengths.length})
              </h4>
              <div className="space-y-2">
                {page.strengths.slice(0, 3).map((strength, idx) => (
                  <div key={idx} className="text-sm p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-100">{strength.heuristic}</p>
                        <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                          {strength.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
