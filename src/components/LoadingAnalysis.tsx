import { Loader2 } from "lucide-react";

export const LoadingAnalysis = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="space-y-2 text-center max-w-md">
        <h3 className="text-xl font-semibold">Analyzing Website...</h3>
        <p className="text-sm text-muted-foreground">
          We're scanning the pages and running it through our AI-powered heuristic evaluation. This usually takes 20-30 seconds.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Capturing page screenshot...</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-200" />
          <span>Extracting HTML structure...</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-400" />
          <span>Running AI analysis...</span>
        </div>
      </div>
    </div>
  );
};
