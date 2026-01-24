import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, User, AlertCircle, Target } from "lucide-react";

interface FrictionPoint {
  id: number;
  x: number;
  y: number;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface SimulationResult {
  frictionPoints: FrictionPoint[];
  monologue: string;
  personaName: string;
}

interface DesignAuditResultsProps {
  imageUrl: string;
  result: SimulationResult;
  onReset: () => void;
}

export function DesignAuditResults({ imageUrl, result, onReset }: DesignAuditResultsProps) {
  const [selectedPoint, setSelectedPoint] = useState<FrictionPoint | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-destructive";
      case "medium":
        return "border-amber-500";
      case "low":
        return "border-blue-500";
      default:
        return "border-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onReset} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          New Simulation
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          Simulated as: <span className="font-medium text-foreground">{result.personaName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image with Markers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Friction Points Identified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative inline-block w-full">
                <img
                  src={imageUrl}
                  alt="Analyzed mockup"
                  className="w-full h-auto rounded-lg"
                  onLoad={() => setImageLoaded(true)}
                />
                
                {/* Friction point markers */}
                {imageLoaded && result.frictionPoints.map((point) => (
                  <button
                    key={point.id}
                    className={`
                      absolute transform -translate-x-1/2 -translate-y-1/2
                      w-8 h-8 rounded-full flex items-center justify-center
                      text-sm font-bold cursor-pointer
                      transition-all duration-200
                      shadow-lg border-2 border-white
                      hover:scale-110 hover:z-20
                      ${getSeverityColor(point.severity)}
                      ${selectedPoint?.id === point.id ? "ring-4 ring-primary/50 scale-110 z-20" : ""}
                    `}
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                    }}
                    onClick={() => setSelectedPoint(point)}
                  >
                    {point.id}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-destructive"></div>
                  <span>High Severity</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span>Medium Severity</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span>Low Severity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monologue Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Persona Monologue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Persona Monologue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="bg-muted/50 rounded-lg p-4 italic text-sm">
                  "{result.monologue}"
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Friction Points List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5" />
                Issues Found ({result.frictionPoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {result.frictionPoints.map((point) => (
                    <button
                      key={point.id}
                      className={`
                        w-full text-left p-3 rounded-lg border-2 transition-all
                        hover:bg-muted/50
                        ${selectedPoint?.id === point.id 
                          ? `${getSeverityBorderColor(point.severity)} bg-muted/50` 
                          : "border-transparent bg-muted/30"
                        }
                      `}
                      onClick={() => setSelectedPoint(point)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`
                            w-6 h-6 rounded-full flex items-center justify-center
                            text-xs font-bold shrink-0
                            ${getSeverityColor(point.severity)}
                          `}
                        >
                          {point.id}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {point.title}
                            </h4>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {point.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {point.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
