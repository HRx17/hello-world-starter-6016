import { useRef, useState, useCallback, useEffect } from "react";
import { JourneyStage, STAGE_TEMPLATES } from "./types";
import { JourneyStageNode } from "./JourneyStageNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, ZoomIn, ZoomOut, Maximize, 
  LayoutGrid, GitBranch, X 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface JourneyCanvasProps {
  stages: JourneyStage[];
  onStagesChange: (stages: JourneyStage[]) => void;
  selectedStageId: string | null;
  onSelectStage: (id: string | null) => void;
}

export function JourneyCanvas({
  stages,
  onStagesChange,
  selectedStageId,
  onSelectStage,
}: JourneyCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [customStageName, setCustomStageName] = useState("");

  // Calculate SVG lines for connections
  const getConnections = useCallback(() => {
    const connections: { from: JourneyStage; to: JourneyStage; label?: string }[] = [];
    stages.forEach(stage => {
      stage.nextStages.forEach(nextId => {
        const nextStage = stages.find(s => s.id === nextId);
        if (nextStage) {
          connections.push({
            from: stage,
            to: nextStage,
            label: stage.branchLabels?.[nextId],
          });
        }
      });
    });
    return connections;
  }, [stages]);

  // Calculate stage order based on connections (BFS from entry points)
  const getStageOrder = useCallback((stages: JourneyStage[], stageId: string): number | null => {
    // Find entry points (stages with no incoming connections)
    const entryPoints = stages.filter(s => !stages.some(other => other.nextStages.includes(s.id)));
    if (entryPoints.length === 0) return null;
    
    // BFS to find order
    const visited = new Set<string>();
    const queue: { id: string; order: number }[] = entryPoints.map(s => ({ id: s.id, order: 1 }));
    
    while (queue.length > 0) {
      const { id, order } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      
      if (id === stageId) return order;
      
      const stage = stages.find(s => s.id === id);
      if (stage) {
        stage.nextStages.forEach(nextId => {
          if (!visited.has(nextId)) {
            queue.push({ id: nextId, order: order + 1 });
          }
        });
      }
    }
    
    return null;
  }, []);

  const handleAddStage = (template?: typeof STAGE_TEMPLATES[0]) => {
    const name = template?.name || customStageName || "New Stage";
    if (!template && !customStageName.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    // Calculate position - try to place to the right of the last stage
    const lastStage = stages[stages.length - 1];
    const newPosition = lastStage 
      ? { x: lastStage.position.x + 280, y: lastStage.position.y }
      : { x: 100, y: 200 };

    const newStage: JourneyStage = {
      id: Date.now().toString(),
      name,
      description: template?.description || "",
      actions: [],
      touchpoints: [],
      thoughts: [],
      painPoints: [],
      opportunities: [],
      emotionLevel: 3,
      position: newPosition,
      nextStages: [],
      type: template?.type || 'action',
    };

    onStagesChange([...stages, newStage]);
    onSelectStage(newStage.id);
    setCustomStageName("");
    toast.success(`Stage "${name}" added!`);
  };

  const handleDeleteStage = (stageId: string) => {
    // Remove the stage and all connections to it
    const updated = stages
      .filter(s => s.id !== stageId)
      .map(s => ({
        ...s,
        nextStages: s.nextStages.filter(id => id !== stageId),
      }));
    onStagesChange(updated);
    if (selectedStageId === stageId) {
      onSelectStage(null);
    }
    toast.success("Stage deleted");
  };

  const handleStartConnection = (fromId: string) => {
    setConnectingFrom(fromId);
    toast.info("Click on a stage to connect to it, or press Escape to cancel");
  };

  const handleCompleteConnection = (toId: string) => {
    if (!connectingFrom || connectingFrom === toId) {
      setConnectingFrom(null);
      return;
    }

    // Check if connection already exists
    const fromStage = stages.find(s => s.id === connectingFrom);
    if (fromStage?.nextStages.includes(toId)) {
      toast.error("Connection already exists");
      setConnectingFrom(null);
      return;
    }

    // Add connection
    onStagesChange(stages.map(s => 
      s.id === connectingFrom 
        ? { ...s, nextStages: [...s.nextStages, toId] }
        : s
    ));
    
    setConnectingFrom(null);
    toast.success("Connection created!");
  };

  const handleRemoveConnection = (fromId: string, toId: string) => {
    onStagesChange(stages.map(s => 
      s.id === fromId 
        ? { ...s, nextStages: s.nextStages.filter(id => id !== toId) }
        : s
    ));
    toast.success("Connection removed");
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectStage(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const autoLayout = () => {
    // Simple auto-layout: arrange in a grid-like flow
    const updated = stages.map((stage, index) => ({
      ...stage,
      position: {
        x: 100 + (index % 4) * 280,
        y: 100 + Math.floor(index / 4) * 200,
      },
    }));
    onStagesChange(updated);
    setPan({ x: 0, y: 0 });
    toast.success("Layout organized!");
  };

  const fitToView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const connections = getConnections();

  return (
    <div className="relative w-full h-full bg-muted/30 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background/95 backdrop-blur p-2 rounded-lg shadow-sm border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Stage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Quick Templates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STAGE_TEMPLATES.map((template) => (
              <DropdownMenuItem 
                key={template.name}
                onClick={() => handleAddStage(template)}
              >
                <span className="mr-2">
                  {template.type === 'start' && '🚩'}
                  {template.type === 'end' && '🎯'}
                  {template.type === 'decision' && '◆'}
                  {template.type === 'touchpoint' && '●'}
                  {template.type === 'action' && '⬛'}
                </span>
                {template.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="p-2">
              <div className="flex gap-2">
                <Input
                  value={customStageName}
                  onChange={(e) => setCustomStageName(e.target.value)}
                  placeholder="Custom stage name..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                />
                <Button size="sm" variant="secondary" onClick={() => handleAddStage()}>
                  Add
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border" />

        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>
          <ZoomOut className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button size="sm" variant="outline" onClick={autoLayout} title="Auto-arrange stages">
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={fitToView} title="Fit to view">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Connection mode indicator */}
      {connectingFrom && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg shadow-sm">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm">Click a stage to connect</span>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 w-6 p-0 hover:bg-green-600"
            onClick={() => setConnectingFrom(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-bg w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }}
      >
        {/* Stage nodes - render first so connections appear below */}
        <div
          className="relative z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {stages.map((stage, index) => {
            // Calculate hierarchy - find stages with no incoming connections (entry points)
            const hasIncoming = stages.some(s => s.nextStages.includes(stage.id));
            const isEntryPoint = !hasIncoming && stages.length > 1;
            const stageOrder = getStageOrder(stages, stage.id);
            
            return (
              <div
                key={stage.id}
                className="absolute"
                style={{
                  left: stage.position.x,
                  top: stage.position.y,
                }}
              >
                <JourneyStageNode
                  stage={stage}
                  isSelected={selectedStageId === stage.id}
                  isConnecting={!!connectingFrom}
                  connectionMode={
                    connectingFrom 
                      ? connectingFrom === stage.id ? 'from' : 'to'
                      : null
                  }
                  isEntryPoint={isEntryPoint}
                  stageOrder={stageOrder}
                  onSelect={() => {
                    if (connectingFrom && connectingFrom !== stage.id) {
                      handleCompleteConnection(stage.id);
                    } else {
                      onSelectStage(stage.id);
                    }
                  }}
                  onStartConnection={() => handleStartConnection(stage.id)}
                  onDelete={() => handleDeleteStage(stage.id)}
                  onConnectTo={
                    connectingFrom && connectingFrom !== stage.id
                      ? () => handleCompleteConnection(stage.id)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>

        {/* SVG for connection lines */}
        <svg 
          className="absolute inset-0 z-0" 
          style={{ 
            width: '100%', 
            height: '100%',
            overflow: 'visible',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon 
                points="0 0, 10 3.5, 0 7" 
                fill="hsl(var(--primary) / 0.6)"
              />
            </marker>
            <marker
              id="arrowhead-hover"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon 
                points="0 0, 10 3.5, 0 7" 
                fill="hsl(var(--destructive))"
              />
            </marker>
          </defs>
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {connections.map(({ from, to, label }) => {
              const startX = from.position.x + 112;
              const startY = from.position.y + 100;
              const endX = to.position.x + 112;
              const endY = to.position.y - 8;
              
              const deltaY = endY - startY;
              const controlOffset = Math.min(Math.abs(deltaY) * 0.5, 80);
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const pathD = `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;
              
              return (
                <g key={`${from.id}-${to.id}`} className="group/connection">
                  {/* Invisible wider path for easier clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(from.id, to.id);
                    }}
                  />
                  {/* Visible path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.4)"
                    strokeWidth="2"
                    strokeDasharray={from.nextStages.length > 1 ? "6,4" : "none"}
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300 pointer-events-none group-hover/connection:stroke-destructive group-hover/connection:[marker-end:url(#arrowhead-hover)]"
                  />
                  {/* Delete button on hover */}
                  <g 
                    className="opacity-0 group-hover/connection:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(from.id, to.id);
                    }}
                  >
                    <circle
                      cx={midX}
                      cy={midY}
                      r="12"
                      fill="hsl(var(--destructive))"
                      className="drop-shadow-md"
                    />
                    <line x1={midX - 4} y1={midY - 4} x2={midX + 4} y2={midY + 4} stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1={midX + 4} y1={midY - 4} x2={midX - 4} y2={midY + 4} stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </g>
                  {label && (
                    <text
                      x={midX}
                      y={midY - 20}
                      textAnchor="middle"
                      className="fill-muted-foreground text-xs font-medium pointer-events-none"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Empty state */}
        {stages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <GitBranch className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Start Your Journey Map</h3>
                <p className="text-muted-foreground text-sm">
                  Click "Add Stage" to begin building your user journey
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help hint - shows when stages exist but no connections yet */}
      {stages.length > 0 && !connectingFrom && stages.every(s => s.nextStages.length === 0) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>Hover over a stage and click the <strong>🔗</strong> icon to connect stages</span>
        </div>
      )}
    </div>
  );
}
