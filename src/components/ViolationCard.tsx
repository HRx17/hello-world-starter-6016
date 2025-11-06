import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, MapPin, Sparkles, Loader2 } from "lucide-react";
import { Violation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { CroppedViolationImage } from "@/components/CroppedViolationImage";

interface ViolationCardProps {
  violation: Violation;
  violationNumber?: number;
  framework?: string;
  url?: string;
  screenshot?: string;
}

const severityConfig = {
  high: {
    color: "border-destructive bg-destructive/10",
    icon: AlertCircle,
    badge: "destructive",
    iconColor: "text-destructive",
  },
  medium: {
    color: "border-yellow-500 bg-yellow-500/10",
    icon: AlertTriangle,
    badge: "default",
    iconColor: "text-yellow-600",
  },
  low: {
    color: "border-blue-500 bg-blue-500/10",
    icon: Info,
    badge: "secondary",
    iconColor: "text-blue-600",
  },
};

export const ViolationCard = ({ violation, violationNumber, framework, url, screenshot }: ViolationCardProps) => {
  const config = severityConfig[violation.severity];
  const Icon = config.icon;
  const { toast } = useToast();
  
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const getAIRecommendation = async () => {
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-ai-recommendations', {
        body: {
          violation: {
            heuristic: violation.heuristic,
            severity: violation.severity,
            description: violation.description,
            element: violation.pageElement || violation.location,
          },
          framework,
          url,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "AI Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setAiRecommendation(data.recommendation);
      toast({
        title: "AI Recommendations Ready",
        description: "Scroll down to see detailed recommendations",
      });
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <Card className={`${config.color} transition-all hover:shadow-md`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`${config.iconColor} mt-1 flex-shrink-0`} size={20} />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                {violationNumber && (
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      violation.severity === "high"
                        ? "bg-destructive"
                        : violation.severity === "medium"
                        ? "bg-yellow-600"
                        : "bg-blue-600"
                    }`}
                  >
                    {violationNumber}
                  </div>
                )}
                <CardTitle className="text-lg">{violation.title}</CardTitle>
              </div>
              
              {/* Violated Heuristic Badge */}
              <div className="inline-flex items-center gap-2 bg-destructive/5 backdrop-blur px-3 py-1.5 rounded-md border border-destructive/20">
                <span className="text-base">❌</span>
                <div className="text-xs">
                  <p className="font-semibold text-destructive uppercase tracking-wide">Violated Heuristic</p>
                  <p className="text-foreground font-medium">{violation.heuristic}</p>
                </div>
              </div>
            </div>
          </div>
          <Badge variant={config.badge as any} className="capitalize">
            {violation.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cropped Screenshot Preview */}
        {screenshot && violation.boundingBox && (
          <CroppedViolationImage
            screenshot={screenshot}
            boundingBox={violation.boundingBox}
            severity={violation.severity}
            title={violation.title}
          />
        )}
        
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">{violation.description}</p>
        </div>
        
        {/* Location Text Section */}
        {violation.location && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
            <MapPin className="text-primary mt-0.5 flex-shrink-0" size={16} />
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Location on Page
              </p>
              <p className="text-sm font-medium text-foreground">
                {violation.location}
              </p>
              {violation.pageElement && (
                <code className="text-xs bg-background px-2 py-0.5 rounded mt-1 inline-block text-muted-foreground">
                  {violation.pageElement}
                </code>
              )}
            </div>
          </div>
        )}
        
        {/* Recommendation Section */}
        <div className="pt-3 border-t bg-background/50 -mx-6 px-6 py-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              💡 Recommended Fix
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {violation.recommendation}
            </p>
          </div>
          
          {/* AI Recommendations Button */}
          <div className="mt-4 pt-4 border-t">
            {!aiRecommendation ? (
              <Button 
                onClick={getAIRecommendation}
                disabled={isLoadingAI}
                variant="outline"
                className="w-full gap-2"
              >
                {isLoadingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating AI Recommendations...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get Detailed AI Recommendations
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  AI-Powered Recommendations
                </div>
                <div className="prose prose-sm max-w-none bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <ReactMarkdown
                    components={{
                      code: ({ node, className, children, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-primary/10 px-1.5 py-0.5 rounded text-xs" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-background p-3 rounded-md text-xs overflow-x-auto" {...props}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => <div className="my-2">{children}</div>,
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      h3: ({ children }) => <h3 className="font-semibold text-sm mt-3 mb-2">{children}</h3>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {aiRecommendation}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
