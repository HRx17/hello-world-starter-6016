import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Violation } from "@/lib/types";

interface ViolationCardProps {
  violation: Violation;
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

export const ViolationCard = ({ violation }: ViolationCardProps) => {
  const config = severityConfig[violation.severity];
  const Icon = config.icon;

  return (
    <Card className={`${config.color} transition-all hover:shadow-md`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`${config.iconColor} mt-1 flex-shrink-0`} size={20} />
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{violation.title}</CardTitle>
              <CardDescription className="text-sm">
                <span className="font-medium text-foreground">Heuristic:</span> {violation.heuristic}
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.badge as any} className="capitalize">
            {violation.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">{violation.description}</p>
        </div>
        
        {violation.location && (
          <div className="pt-2 border-t">
            <p className="text-sm">
              <span className="font-medium">Location:</span>{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{violation.location}</code>
            </p>
          </div>
        )}
        
        <div className="pt-2 border-t bg-background/50 -mx-6 px-6 py-3 rounded-b-lg">
          <p className="text-sm">
            <span className="font-medium text-foreground">Recommendation:</span>{" "}
            <span className="text-muted-foreground">{violation.recommendation}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
