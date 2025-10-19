import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Globe, FileCheck } from "lucide-react";

interface CrawlProgressCardProps {
  status: string;
  totalPages: number;
  crawledPages: number;
  analyzedPages: number;
  estimatedTimeRemaining?: string;
}

export const CrawlProgressCard = ({
  status,
  totalPages,
  crawledPages,
  analyzedPages,
  estimatedTimeRemaining,
}: CrawlProgressCardProps) => {
  const crawlProgress = totalPages > 0 ? (crawledPages / totalPages) * 100 : 0;
  const analysisProgress = totalPages > 0 ? (analyzedPages / totalPages) * 100 : 0;

  const getStatusMessage = () => {
    switch (status) {
      case 'queued':
        return 'Preparing to crawl website...';
      case 'crawling':
        return 'Discovering pages...';
      case 'analyzing':
        return 'Analyzing pages...';
      case 'completed':
        return 'Analysis complete!';
      case 'error':
        return 'An error occurred';
      default:
        return 'Processing...';
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Website Analysis in Progress
        </CardTitle>
        <CardDescription>{getStatusMessage()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crawl Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Discovering Pages</span>
            </div>
            <span className="text-muted-foreground">
              {crawledPages} / {totalPages || '?'}
            </span>
          </div>
          <Progress value={crawlProgress} className="h-2" />
        </div>

        {/* Analysis Progress */}
        {status === 'analyzing' || status === 'completed' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-500" />
                <span className="font-medium">Analyzing UX</span>
              </div>
              <span className="text-muted-foreground">
                {analyzedPages} / {totalPages}
              </span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
          </div>
        ) : null}

        {/* Status Details */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm text-muted-foreground">
            {status === 'crawling' && 'We\'re crawling your website to discover all pages...'}
            {status === 'analyzing' && 'Each page is being analyzed with AI for UX issues...'}
            {status === 'completed' && 'All pages have been analyzed successfully!'}
          </p>
          {estimatedTimeRemaining && status === 'analyzing' && (
            <div className="flex items-center gap-2 text-sm bg-primary/5 p-3 rounded-lg border border-primary/10">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">
                Estimated time remaining: <span className="font-semibold text-foreground">{estimatedTimeRemaining}</span>
              </span>
            </div>
          )}
          {status === 'crawling' && totalPages > 0 && (
            <div className="text-xs text-muted-foreground">
              Analysis will begin once all pages are discovered
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
