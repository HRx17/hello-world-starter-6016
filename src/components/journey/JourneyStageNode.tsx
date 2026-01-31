import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Smile, Meh, Frown, GitBranch, Plus, Trash2, 
  Circle, Diamond, Square, Flag, Target, Link, GripVertical
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
  isDragging?: boolean;
  onSelect: () => void;
  onStartConnection: () => void;
  onDelete: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onConnectTo?: () => void;
  connectionMode?: 'from' | 'to' | null;
  isEntryPoint?: boolean;
  stageOrder?: number | null;
}

export function JourneyStageNode({
  stage,
  isSelected,
  isConnecting,
  isDragging,
  onSelect,
  onStartConnection,
  onDelete,
  onDragStart,
  onConnectTo,
  connectionMode,
  isEntryPoint,
  stageOrder,
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
      case 'start': return 'border-green-500/50 bg-green-500/5';
      case 'end': return 'border-blue-500/50 bg-blue-500/5';
      case 'decision': return 'border-amber-500/50 bg-amber-500/5';
      case 'touchpoint': return 'border-purple-500/50 bg-purple-500/5';
      default: return 'border-border bg-card';
    }
  };

  const hasContent = stage.actions.length > 0 || stage.touchpoints.length > 0 || 
                     stage.painPoints.length > 0 || stage.thoughts.length > 0;

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative w-56 rounded-xl border-2 p-4 transition-all duration-200 shadow-sm hover:shadow-lg group bg-background select-none",
          getTypeColor(),
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          connectionMode === 'to' && "ring-2 ring-green-500/70",
          isDragging && "shadow-2xl scale-105 opacity-90 cursor-grabbing",
          !isDragging && "cursor-grab"
        )}
        onClick={onSelect}
        onMouseDown={(e) => {
          // Only start drag if not clicking on buttons
          if ((e.target as HTMLElement).closest('button')) return;
          onDragStart?.(e);
        }}
      >
        {/* Entry point / Order indicator */}
        {(isEntryPoint || stageOrder) && (
          <div className="absolute -top-3 left-4 flex items-center gap-1.5">
            {isEntryPoint && (
              <span className="bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Entry
              </span>
            )}
            {stageOrder && (
              <span className="bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded-full">
                Step {stageOrder}
              </span>
            )}
          </div>
        )}

        {/* Drag handle indicator */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{getTypeIcon()}</span>
            <h4 className="font-semibold text-sm truncate max-w-[120px]">{stage.name}</h4>
          </div>
          {getEmotionIcon(stage.emotionLevel)}
        </div>

        {/* Description */}
        {stage.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {stage.description}
          </p>
        )}

        {/* Quick stats */}
        <div className="flex flex-wrap gap-1 mb-2">
          {stage.actions.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {stage.actions.length} action{stage.actions.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {stage.painPoints.length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {stage.painPoints.length} pain point{stage.painPoints.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {stage.opportunities.length > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-green-600">
              {stage.opportunities.length} opp.
            </Badge>
          )}
        </div>

        {/* Emotion label */}
        <div className="text-[10px] text-muted-foreground font-medium">
          {EMOTION_LABELS[stage.emotionLevel]}
        </div>

        {/* Branch indicator - now cleaner, in corner */}
        {stage.nextStages.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                <GitBranch className="h-3 w-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Branches to {stage.nextStages.length} paths</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Connection output indicator - subtle dot at bottom */}
        {stage.nextStages.length > 0 && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/60 border-2 border-background" />
        )}

        {/* Action buttons - visible on hover or when selected */}
        {!isConnecting && (
          <div className={cn(
            "absolute -right-2 top-8 flex flex-col gap-1 transition-opacity duration-200",
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

        {/* Connect target indicator - cleaner overlay */}
        {connectionMode === 'to' && onConnectTo && (
          <div 
            className="absolute inset-0 bg-green-500/10 rounded-xl flex items-center justify-center backdrop-blur-[1px]"
            onClick={(e) => {
              e.stopPropagation();
              onConnectTo();
            }}
          >
            <div className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Plus className="h-3 w-3" />
              Connect here
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
