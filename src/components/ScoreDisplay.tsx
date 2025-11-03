import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
  metadata?: {
    warnings?: string[];
    stage1Success?: boolean;
  };
}

const getScoreInfo = (score: number) => {
  if (score >= 80) {
    return {
      label: "Excellent",
      color: "text-green-600",
      description: "This website demonstrates strong usability principles",
    };
  } else if (score >= 60) {
    return {
      label: "Good",
      color: "text-blue-600",
      description: "Solid usability with room for improvement",
    };
  } else if (score >= 40) {
    return {
      label: "Needs Improvement",
      color: "text-yellow-600",
      description: "Several usability issues need attention",
    };
  } else {
    return {
      label: "Poor",
      color: "text-destructive",
      description: "Significant usability problems detected",
    };
  }
};

export const ScoreDisplay = ({ score, metadata }: ScoreDisplayProps) => {
  const info = getScoreInfo(score);
  const hasWarnings = metadata?.warnings && metadata.warnings.length > 0;

  return (
    <div className="space-y-4">
      {hasWarnings && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Analysis Note:</strong> {metadata.warnings[0]}
            {metadata.warnings.length > 1 && (
              <ul className="mt-2 ml-4 list-disc text-xs space-y-1">
                {metadata.warnings.slice(1).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="text-center">
        <div className={`text-6xl font-bold ${info.color} mb-2`}>{score}</div>
        <div className="text-sm text-muted-foreground">out of 100</div>
      </div>
      
      <Progress value={score} className="h-3" />
      
      <div className="text-center space-y-1">
        <div className={`text-xl font-semibold ${info.color}`}>{info.label}</div>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>
    </div>
  );
};
