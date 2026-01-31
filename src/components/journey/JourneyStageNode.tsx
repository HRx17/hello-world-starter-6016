import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Smile, Meh, Frown, GitBranch, Plus, Trash2, 
  Circle, Diamond, Square, Flag, Target, Link, Edit2
} from "lucide-react";
import { JourneyStage, EMOTION_LABELS } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JourneyStageNodeProps {
  stage: JourneyStage;
  isSelected: boolean;
  isConnecting: boolean;
  onSelect: () => void;
  onStartConnection: () => void;
  onDelete: () => void;
  onConnectTo?: () => void;
  connectionMode?: 'from' | 'to' | null;
}

export function JourneyStageNode({
  stage,
  isSelected,
  isConnecting,
  onSelect,
  onStartConnection,
  onDelete,
  onConnectTo,
  connectionMode,
}: JourneyStageNodeProps) {
  const getEmotionIcon = (level: number) => {
    if (level >= 4) return <Smile className="h-4 w-4 text-green-500" />;
    if (level >= 3) return <Meh className="h-4 w-4 text-yellow-500" />;
    return <Frown className="h-4 w-4 text-red-500" />;
  };

  const getTypeIcon = () => {
    switch (stage.type) {
      case 'start': return <Flag className="h-4 w-4" />;
      case 'end': return <Target className="h-4 w-4" />;
      case 'decision': return <Diamond className="h-4 w-4" />;
      case 'touchpoint': return <Circle className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (stage.type) {
      case 'start': return 'border-green-500 bg-green-500/10';
      case 'end': return 'border-blue-500 bg-blue-500/10';
      case 'decision': return 'border-amber-500 bg-amber-500/10';
      case 'touchpoint': return 'border-purple-500 bg-purple-500/10';
      default: return 'border-border bg-card';
    }
  };

  const hasContent = stage.actions.length > 0 || stage.touchpoints.length > 0 || 
                     stage.painPoints.length > 0 || stage.thoughts.length > 0;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative w-56 rounded-lg border-2 p-3 cursor-pointer transition-all shadow-sm hover:shadow-md group",
          getTypeColor(),
          isSelected && "ring-2 ring-primary ring-offset-2",
          connectionMode === 'to' && "ring-2 ring-green-500 animate-pulse cursor-pointer"
        )}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{getTypeIcon()}</span>
            <h4 className="font-semibold text-sm truncate max-w-[120px]">{stage.name}</h4>
          </div>
          {getEmotionIcon(stage.emotionLevel)}
        </div>

        {/* Description */}
        {stage.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {stage.description}
          </p>
        )}

        {/* Quick stats */}
        <div className="flex flex-wrap gap-1 mb-2">
          {stage.actions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {stage.actions.length} action{stage.actions.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {stage.painPoints.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {stage.painPoints.length} pain point{stage.painPoints.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {stage.opportunities.length > 0 && (
            <Badge className="text-xs bg-green-600">
              {stage.opportunities.length} opp.
            </Badge>
          )}
        </div>

        {/* Emotion label */}
        <div className="text-xs text-muted-foreground">
          {EMOTION_LABELS[stage.emotionLevel]}
        </div>

        {/* Branch indicator */}
        {stage.nextStages.length > 1 && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2">
            <div className="bg-amber-500 text-white rounded-full p-1" title="Branches to multiple paths">
              <GitBranch className="h-3 w-3" />
            </div>
          </div>
        )}

        {/* Connection count indicator */}
        {stage.nextStages.length > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
            {stage.nextStages.length} →
          </div>
        )}

        {/* Action buttons - visible on hover or when selected */}
        {!isConnecting && (
          <div className={cn(
            "absolute -right-2 top-2 flex flex-col gap-1 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 w-7 rounded-full p-0 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartConnection();
                  }}
                >
                  <Link className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Connect to another stage</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 w-7 rounded-full p-0 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Delete stage</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Connect target indicator - more prominent */}
        {connectionMode === 'to' && onConnectTo && (
          <div 
            className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onConnectTo();
            }}
          >
            <div className="bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 shadow-lg">
              <Link className="h-4 w-4" />
              Click to connect
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
