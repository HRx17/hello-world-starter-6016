import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, MapPin, Eye } from "lucide-react";
import { Violation } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ViolationCardProps {
  violation: Violation;
  violationNumber?: number; // For linking to annotated screenshot
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

export const ViolationCard = ({ violation, violationNumber }: ViolationCardProps) => {
  const config = severityConfig[violation.severity];
  const Icon = config.icon;

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
