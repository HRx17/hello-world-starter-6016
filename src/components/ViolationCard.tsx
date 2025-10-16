import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, MapPin, Eye } from "lucide-react";
import { Violation } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ViolationCardProps {
  violation: Violation;
  screenshot?: string;
  onViewScreenshot?: () => void;
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

export const ViolationCard = ({ violation, screenshot, onViewScreenshot }: ViolationCardProps) => {
  const config = severityConfig[violation.severity];
  const Icon = config.icon;

  return (
    <Card className={`${config.color} transition-all hover:shadow-md`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`${config.iconColor} mt-1 flex-shrink-0`} size={20} />
            <div className="space-y-2 flex-1">
              <CardTitle className="text-lg">{violation.title}</CardTitle>
              
              {/* Violated Heuristic Badge - Made clear it's a violation */}
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
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">{violation.description}</p>
        </div>

        {/* Screenshot Preview Section */}
        {screenshot && (
          <div className="bg-muted/30 rounded-lg overflow-hidden border">
            <div className="p-2 bg-muted/50 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Page Screenshot
              </span>
              {onViewScreenshot && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewScreenshot}
                  className="h-6 text-xs"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View Full Size
                </Button>
              )}
            </div>
            <div className="p-2">
              <img
                src={screenshot}
                alt="Page screenshot showing violation area"
                className="w-full h-auto rounded border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={onViewScreenshot}
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Click to view full screenshot and locate the issue
              </p>
            </div>
          </div>
        )}
        
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
        <div className="pt-3 border-t bg-background/50 -mx-6 px-6 py-4 rounded-b-lg">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              💡 Recommended Fix
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {violation.recommendation}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
