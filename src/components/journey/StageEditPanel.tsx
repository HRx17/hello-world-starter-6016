import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Smile, Meh, Frown } from "lucide-react";
import { JourneyStage, EMOTION_LABELS } from "./types";

interface StageEditPanelProps {
  stage: JourneyStage | null;
  allStages: JourneyStage[];
  open: boolean;
  onClose: () => void;
  onUpdate: (stage: JourneyStage) => void;
  onRemoveConnection: (fromId: string, toId: string) => void;
}

export function StageEditPanel({ 
  stage, 
  allStages,
  open, 
  onClose, 
  onUpdate,
  onRemoveConnection,
}: StageEditPanelProps) {
  const [newAction, setNewAction] = useState("");
  const [newTouchpoint, setNewTouchpoint] = useState("");
  const [newThought, setNewThought] = useState("");
  const [newPainPoint, setNewPainPoint] = useState("");
  const [newOpportunity, setNewOpportunity] = useState("");

  if (!stage) return null;

  const addItem = (field: keyof JourneyStage, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = stage[field];
    if (Array.isArray(current)) {
      onUpdate({ ...stage, [field]: [...current, value.trim()] });
      setter("");
    }
  };

  const removeItem = (field: keyof JourneyStage, index: number) => {
    const current = stage[field];
    if (Array.isArray(current)) {
      onUpdate({ ...stage, [field]: current.filter((_, i) => i !== index) });
    }
  };

  const getEmotionIcon = (level: number) => {
    if (level >= 4) return <Smile className="h-5 w-5" />;
    if (level >= 3) return <Meh className="h-5 w-5" />;
    return <Frown className="h-5 w-5" />;
  };

  const connectedStages = allStages.filter(s => stage.nextStages.includes(s.id));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Stage</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Stage Name</Label>
              <Input
                value={stage.name}
                onChange={(e) => onUpdate({ ...stage, name: e.target.value })}
                placeholder="E.g., Research Phase"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={stage.description || ""}
                onChange={(e) => onUpdate({ ...stage, description: e.target.value })}
                placeholder="What happens at this stage?"
                rows={2}
              />
            </div>

            <div>
              <Label>Stage Type</Label>
              <Select 
                value={stage.type || "action"} 
                onValueChange={(v) => onUpdate({ ...stage, type: v as JourneyStage['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">🚩 Start</SelectItem>
                  <SelectItem value="action">⬛ Action</SelectItem>
                  <SelectItem value="decision">◆ Decision Point</SelectItem>
                  <SelectItem value="touchpoint">● Touchpoint</SelectItem>
                  <SelectItem value="end">🎯 End</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Emotion Level</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    size="sm"
                    variant={stage.emotionLevel === level ? "default" : "outline"}
                    onClick={() => onUpdate({ ...stage, emotionLevel: level })}
                    className="flex-1"
                  >
                    <span className="flex items-center gap-1">
                      {getEmotionIcon(level)}
                      <span className="text-xs hidden sm:inline">{EMOTION_LABELS[level]}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabbed content */}
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              <TabsTrigger value="touchpoints" className="text-xs">Touch</TabsTrigger>
              <TabsTrigger value="thoughts" className="text-xs">Thoughts</TabsTrigger>
              <TabsTrigger value="pain" className="text-xs">Pain</TabsTrigger>
              <TabsTrigger value="opps" className="text-xs">Opps</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  placeholder="What does the user do?"
                  onKeyDown={(e) => e.key === 'Enter' && addItem('actions', newAction, setNewAction)}
                />
                <Button size="sm" onClick={() => addItem('actions', newAction, setNewAction)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {stage.actions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between bg-accent/50 p-2 rounded text-sm">
                    <span>• {action}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('actions', i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {stage.actions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No actions added</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="touchpoints" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTouchpoint}
                  onChange={(e) => setNewTouchpoint(e.target.value)}
                  placeholder="Website, App, Store, Email..."
                  onKeyDown={(e) => e.key === 'Enter' && addItem('touchpoints', newTouchpoint, setNewTouchpoint)}
                />
                <Button size="sm" onClick={() => addItem('touchpoints', newTouchpoint, setNewTouchpoint)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {stage.touchpoints.map((tp, i) => (
                  <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => removeItem('touchpoints', i)}>
                    {tp} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                {stage.touchpoints.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 w-full">No touchpoints added</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="thoughts" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value)}
                  placeholder="What is the user thinking?"
                  onKeyDown={(e) => e.key === 'Enter' && addItem('thoughts', newThought, setNewThought)}
                />
                <Button size="sm" onClick={() => addItem('thoughts', newThought, setNewThought)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {stage.thoughts.map((thought, i) => (
                  <div key={i} className="flex items-center justify-between bg-accent/30 p-2 rounded text-sm italic">
                    <span>"{thought}"</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('thoughts', i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {stage.thoughts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No thoughts added</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pain" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  placeholder="What problems do they encounter?"
                  onKeyDown={(e) => e.key === 'Enter' && addItem('painPoints', newPainPoint, setNewPainPoint)}
                />
                <Button size="sm" onClick={() => addItem('painPoints', newPainPoint, setNewPainPoint)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {stage.painPoints.map((pain, i) => (
                  <div key={i} className="flex items-center justify-between bg-destructive/10 p-2 rounded text-sm">
                    <span>⚠️ {pain}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('painPoints', i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {stage.painPoints.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No pain points added</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="opps" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newOpportunity}
                  onChange={(e) => setNewOpportunity(e.target.value)}
                  placeholder="How can we improve this?"
                  onKeyDown={(e) => e.key === 'Enter' && addItem('opportunities', newOpportunity, setNewOpportunity)}
                />
                <Button size="sm" onClick={() => addItem('opportunities', newOpportunity, setNewOpportunity)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {stage.opportunities.map((opp, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-500/10 p-2 rounded text-sm">
                    <span>💡 {opp}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeItem('opportunities', i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {stage.opportunities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No opportunities added</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Connections */}
          {connectedStages.length > 0 && (
            <div className="space-y-2">
              <Label>Connected to:</Label>
              <div className="flex flex-wrap gap-2">
                {connectedStages.map((s) => (
                  <Badge 
                    key={s.id} 
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onRemoveConnection(stage.id, s.id)}
                  >
                    → {s.name} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click to remove connection</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
