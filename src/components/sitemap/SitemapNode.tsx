import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Link, GripVertical, Plus } from "lucide-react";
import { SitemapNode as SitemapNodeType, NODE_TYPE_COLORS, NODE_TYPE_ICONS } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SitemapNodeProps {
  node: SitemapNodeType;
  isSelected: boolean;
  isConnecting: boolean;
  isDragging?: boolean;
  isRoot?: boolean;
  childCount: number;
  parentLabel?: string;
  connectionMode?: 'from' | 'to' | null;
  onSelect: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onStartConnection: () => void;
  onDelete: () => void;
  onConnectTo?: () => void;
}

export function SitemapNodeComponent({
  node,
  isSelected,
  isConnecting,
  isDragging,
  isRoot,
  childCount,
  parentLabel,
  connectionMode,
  onSelect,
  onDragStart,
  onStartConnection,
  onDelete,
  onConnectTo,
}: SitemapNodeProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative w-48 rounded-xl border-2 p-3 transition-all duration-200 shadow-sm hover:shadow-lg group bg-background select-none",
          NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.page,
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          connectionMode === 'to' && "ring-2 ring-green-500/70",
          isDragging && "shadow-2xl scale-105 opacity-90 cursor-grabbing",
          !isDragging && "cursor-grab"
        )}
        onClick={onSelect}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onDragStart?.(e);
        }}
      >
        {/* Root indicator */}
        {isRoot && (
          <div className="absolute -top-3 left-3">
            <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Root
            </span>
          </div>
        )}

        {/* Drag handle indicator */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1 mt-1">
          <span className="text-base">{NODE_TYPE_ICONS[node.type]}</span>
          <h4 className="font-semibold text-sm truncate flex-1">{node.label}</h4>
        </div>

        {/* Description */}
        {node.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {node.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {node.type}
          </Badge>
          {childCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {childCount} child{childCount !== 1 ? 'ren' : ''}
            </span>
          )}
        </div>

        {/* Connection output indicator */}
        {childCount > 0 && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary/60 border-2 border-background" />
        )}

        {/* Action buttons */}
        {!isConnecting && (
          <div className={cn(
            "absolute -right-2 top-6 flex flex-col gap-1 transition-opacity duration-200",
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
                <p>Set as parent of another node</p>
              </TooltipContent>
            </Tooltip>

            {!isRoot && (
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
                  <p>Delete node</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Connect target indicator */}
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
              Set as child
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
