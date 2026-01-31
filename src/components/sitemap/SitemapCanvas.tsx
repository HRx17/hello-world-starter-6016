import { useRef, useState, useCallback, useEffect } from "react";
import { SitemapNode } from "./types";
import { SitemapNodeComponent } from "./SitemapNode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface SitemapCanvasProps {
  nodes: SitemapNode[];
  onNodesChange: (nodes: SitemapNode[]) => void;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

const NODE_TEMPLATES = [
  { label: 'Home', type: 'page' as const },
  { label: 'Products', type: 'category' as const },
  { label: 'About', type: 'page' as const },
  { label: 'Contact', type: 'page' as const },
  { label: 'Blog', type: 'section' as const },
  { label: 'FAQ', type: 'page' as const },
  { label: 'Search', type: 'feature' as const },
  { label: 'Cart', type: 'feature' as const },
];

export function SitemapCanvas({
  nodes,
  onNodesChange,
  selectedNodeId,
  onSelectNode,
}: SitemapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [customNodeLabel, setCustomNodeLabel] = useState("");
  const [customNodeType, setCustomNodeType] = useState<'page' | 'section' | 'category' | 'feature'>('page');
  
  // Drag and drop state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  // Calculate connections (parent-child relationships)
  const getConnections = useCallback(() => {
    const connections: { parent: SitemapNode; child: SitemapNode }[] = [];
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent) {
          connections.push({ parent, child: node });
        }
      }
    });
    return connections;
  }, [nodes]);

  const handleAddNode = (template?: { label: string; type: 'page' | 'section' | 'category' | 'feature' }) => {
    const label = template?.label || customNodeLabel;
    const type = template?.type || customNodeType;
    
    if (!template && !customNodeLabel.trim()) {
      toast.error("Please enter a node label");
      return;
    }

    // Position new node to the right of the last node
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode 
      ? { x: lastNode.position.x + 220, y: lastNode.position.y }
      : { x: 100, y: 100 };

    const newNode: SitemapNode = {
      id: Date.now().toString(),
      label,
      parentId: nodes.length > 0 ? nodes[0].id : null, // Default parent is root
      type,
      position: newPosition,
    };

    onNodesChange([...nodes, newNode]);
    onSelectNode(newNode.id);
    setCustomNodeLabel("");
    toast.success(`"${label}" added!`);
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Can't delete root
    if (!node.parentId) {
      toast.error("Cannot delete root node");
      return;
    }

    // Remove node and reassign children to deleted node's parent
    const updated = nodes
      .filter(n => n.id !== nodeId)
      .map(n => n.parentId === nodeId ? { ...n, parentId: node.parentId } : n);
    
    onNodesChange(updated);
    if (selectedNodeId === nodeId) {
      onSelectNode(null);
    }
    toast.success("Node deleted");
  };

  const handleStartConnection = (fromId: string) => {
    setConnectingFrom(fromId);
    toast.info("Click on a node to make it a child, or press Escape to cancel");
  };

  const handleCompleteConnection = (toId: string) => {
    if (!connectingFrom || connectingFrom === toId) {
      setConnectingFrom(null);
      return;
    }

    // Prevent circular references
    const wouldCreateCycle = (parentId: string, childId: string): boolean => {
      if (parentId === childId) return true;
      const parent = nodes.find(n => n.id === parentId);
      if (parent?.parentId) {
        return wouldCreateCycle(parent.parentId, childId);
      }
      return false;
    };

    if (wouldCreateCycle(toId, connectingFrom)) {
      toast.error("Cannot create circular reference");
      setConnectingFrom(null);
      return;
    }

    // Set the clicked node as a child of connectingFrom
    onNodesChange(nodes.map(n => 
      n.id === toId 
        ? { ...n, parentId: connectingFrom }
        : n
    ));
    
    setConnectingFrom(null);
    toast.success("Parent-child relationship set!");
  };

  const handleRemoveConnection = (childId: string) => {
    const rootNode = nodes.find(n => !n.parentId);
    if (!rootNode) return;
    
    // Set parent to root instead of null
    onNodesChange(nodes.map(n => 
      n.id === childId 
        ? { ...n, parentId: rootNode.id }
        : n
    ));
    toast.success("Connection removed - node moved to root");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectingFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag handlers
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDraggingNodeId(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: node.position.x, y: node.position.y });
    setHasDragged(false);
  };

  const handleNodeDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNodeId) return;
    
    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasDragged(true);
    }
    
    const newX = Math.max(0, dragOffset.x + deltaX);
    const newY = Math.max(0, dragOffset.y + deltaY);
    
    onNodesChange(nodes.map(n => 
      n.id === draggingNodeId 
        ? { ...n, position: { x: newX, y: newY } }
        : n
    ));
  }, [draggingNodeId, dragStart, dragOffset, zoom, nodes, onNodesChange]);

  const handleNodeDragEnd = () => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      setTimeout(() => setHasDragged(false), 50);
    }
  };

  const handleNodeSelect = (nodeId: string) => {
    if (hasDragged) return;
    if (connectingFrom && connectingFrom !== nodeId) {
      handleCompleteConnection(nodeId);
    } else {
      onSelectNode(nodeId);
    }
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      handleNodeDragMove(e);
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    handleNodeDragEnd();
  };

  const autoLayout = () => {
    // Organize nodes in a tree layout
    const rootNode = nodes.find(n => !n.parentId);
    if (!rootNode) return;

    const getChildren = (parentId: string) => nodes.filter(n => n.parentId === parentId);
    const levelWidth = 200;
    const nodeHeight = 120;
    
    const positionNode = (node: SitemapNode, level: number, index: number, siblingCount: number): SitemapNode[] => {
      const x = 100 + level * levelWidth;
      const totalHeight = siblingCount * nodeHeight;
      const startY = 100 + (400 - totalHeight) / 2;
      const y = startY + index * nodeHeight;
      
      const children = getChildren(node.id);
      const childPositions = children.flatMap((child, i) => 
        positionNode(child, level + 1, i, children.length)
      );
      
      return [{ ...node, position: { x, y } }, ...childPositions];
    };

    const positioned = positionNode(rootNode, 0, 0, 1);
    onNodesChange(positioned);
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
              Add Page
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Quick Templates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NODE_TEMPLATES.map((template) => (
              <DropdownMenuItem 
                key={template.label}
                onClick={() => handleAddNode(template)}
              >
                <span className="mr-2">
                  {template.type === 'page' && '📄'}
                  {template.type === 'section' && '📁'}
                  {template.type === 'category' && '🏷️'}
                  {template.type === 'feature' && '⚡'}
                </span>
                {template.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              <Input
                value={customNodeLabel}
                onChange={(e) => setCustomNodeLabel(e.target.value)}
                placeholder="Custom page name..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
              />
              <Select value={customNodeType} onValueChange={(v) => setCustomNodeType(v as any)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">📄 Page</SelectItem>
                  <SelectItem value="section">📁 Section</SelectItem>
                  <SelectItem value="category">🏷️ Category</SelectItem>
                  <SelectItem value="feature">⚡ Feature</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => handleAddNode()}>
                Add
              </Button>
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

        <Button size="sm" variant="outline" onClick={autoLayout} title="Auto-arrange nodes">
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
          <span className="text-sm">Click a node to set as child</span>
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
        {/* Nodes */}
        <div
          className="relative z-10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => {
            const childCount = nodes.filter(n => n.parentId === node.id).length;
            const parent = nodes.find(n => n.id === node.parentId);
            const isRoot = !node.parentId;
            
            return (
              <div
                key={node.id}
                className={cn(
                  "absolute transition-shadow",
                  draggingNodeId === node.id && "z-50"
                )}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                }}
              >
                <SitemapNodeComponent
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  isConnecting={!!connectingFrom}
                  isDragging={draggingNodeId === node.id}
                  isRoot={isRoot}
                  childCount={childCount}
                  parentLabel={parent?.label}
                  connectionMode={
                    connectingFrom 
                      ? connectingFrom === node.id ? 'from' : 'to'
                      : null
                  }
                  onSelect={() => handleNodeSelect(node.id)}
                  onDragStart={(e) => handleNodeDragStart(node.id, e)}
                  onStartConnection={() => handleStartConnection(node.id)}
                  onDelete={() => handleDeleteNode(node.id)}
                  onConnectTo={
                    connectingFrom && connectingFrom !== node.id
                      ? () => handleCompleteConnection(node.id)
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
              id="sitemap-arrowhead"
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
              id="sitemap-arrowhead-hover"
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
            {connections.map(({ parent, child }) => {
              const startX = parent.position.x + 96;
              const startY = parent.position.y + 80;
              const endX = child.position.x + 96;
              const endY = child.position.y - 8;
              
              const deltaY = endY - startY;
              const controlOffset = Math.min(Math.abs(deltaY) * 0.5, 60);
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const pathD = `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;
              
              return (
                <g key={`${parent.id}-${child.id}`} className="group/connection">
                  {/* Invisible wider path for clicking */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(child.id);
                    }}
                  />
                  {/* Visible path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.4)"
                    strokeWidth="2"
                    markerEnd="url(#sitemap-arrowhead)"
                    className="transition-all duration-300 pointer-events-none group-hover/connection:stroke-destructive group-hover/connection:[marker-end:url(#sitemap-arrowhead-hover)]"
                  />
                  {/* Delete button on hover */}
                  <g 
                    className="opacity-0 group-hover/connection:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(child.id);
                    }}
                  >
                    <circle cx={midX} cy={midY} r="12" fill="hsl(var(--destructive))" className="drop-shadow-md" />
                    <line x1={midX - 4} y1={midY - 4} x2={midX + 4} y2={midY + 4} stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1={midX + 4} y1={midY - 4} x2={midX - 4} y2={midY + 4} stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Start Your Sitemap</h3>
                <p className="text-muted-foreground text-sm">
                  Click "Add Page" to begin building your site structure
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help hint */}
      {nodes.length > 0 && !connectingFrom && nodes.filter(n => n.parentId).length === 0 && nodes.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>Hover over a node and click the <strong>🔗</strong> icon to set parent-child relationships</span>
        </div>
      )}
    </div>
  );
}
