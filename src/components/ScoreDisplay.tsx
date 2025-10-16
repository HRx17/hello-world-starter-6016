import { Progress } from "@/components/ui/progress";

interface ScoreDisplayProps {
  score: number;
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

export const ScoreDisplay = ({ score }: ScoreDisplayProps) => {
  const info = getScoreInfo(score);

  return (
    <div className="space-y-4">
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
