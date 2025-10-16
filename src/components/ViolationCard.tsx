import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, MapPin, Eye } from "lucide-react";
import { Violation } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface ViolationCardProps {
  violation: Violation;
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

// Nielsen's heuristics with emojis for visual distinction
const heuristicIcons: Record<string, string> = {
  "Visibility of system status": "👁️",
  "Match between system and the real world": "🌍",
  "User control and freedom": "🎮",
  "Consistency and standards": "📐",
  "Error prevention": "🛡️",
  "Recognition rather than recall": "🧠",
  "Flexibility and efficiency of use": "⚡",
  "Aesthetic and minimalist design": "🎨",
  "Help users recognize, diagnose, and recover from errors": "🔧",
  "Help and documentation": "📚",
};

export const ViolationCard = ({ violation, onViewScreenshot }: ViolationCardProps) => {
  const config = severityConfig[violation.severity];
  const Icon = config.icon;
  const heuristicEmoji = heuristicIcons[violation.heuristic] || "🔍";

  return (
    <Card className={`${config.color} transition-all hover:shadow-md`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`${config.iconColor} mt-1 flex-shrink-0`} size={20} />
            <div className="space-y-2 flex-1">
              <CardTitle className="text-lg">{violation.title}</CardTitle>
              
              {/* Prominent Heuristic Badge */}
              <div className="inline-flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border">
                <span className="text-lg">{heuristicEmoji}</span>
                <span className="text-sm font-medium text-foreground">
                  {violation.heuristic}
                </span>
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
        
        {/* Prominent Location Section */}
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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                💡 Recommended Fix
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {violation.recommendation}
              </p>
            </div>
            {onViewScreenshot && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewScreenshot}
                className="flex-shrink-0"
              >
                <Eye className="mr-2 h-4 w-4" />
                View on Page
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
