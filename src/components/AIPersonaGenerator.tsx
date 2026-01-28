import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GeneratedPersona {
  name: string;
  description: string;
  demographics: {
    age: string;
    occupation: string;
    tech_savviness: string;
  };
  goals: string[];
  pain_points: string[];
  behaviors?: {
    habits?: string;
    preferences?: string;
    motivations?: string;
  };
}

interface AIPersonaGeneratorProps {
  onPersonaGenerated: (persona: GeneratedPersona) => void;
  initialStudyId?: string;
}

export function AIPersonaGenerator({ onPersonaGenerated, initialStudyId }: AIPersonaGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState<string>(initialStudyId || "");
  const [selectedObservationIds, setSelectedObservationIds] = useState<string[]>([]);

  // Fetch study plans
  const { data: studyPlans, isLoading: loadingStudies } = useQuery({
    queryKey: ['study-plans-for-persona'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('id, title, problem_statement')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch observations for selected study
  const { data: observations, isLoading: loadingObservations } = useQuery({
    queryKey: ['observations-for-persona', selectedStudyId],
    queryFn: async () => {
      let query = supabase
        .from('research_observations')
        .select('id, content, observation_type, tags')
        .order('created_at', { ascending: false });
      
      if (selectedStudyId) {
        query = query.eq('study_plan_id', selectedStudyId);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-persona', {
        body: {
          studyPlanId: selectedStudyId || null,
          observationIds: selectedObservationIds.length > 0 ? selectedObservationIds : null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.persona as GeneratedPersona;
    },
    onSuccess: (persona) => {
      toast.success(`Generated persona: ${persona.name}`);
      onPersonaGenerated(persona);
      setOpen(false);
      // Reset selections
      setSelectedObservationIds([]);
    },
    onError: (error) => {
      console.error('Failed to generate persona:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate persona');
    },
  });

  const toggleObservation = (id: string) => {
    setSelectedObservationIds(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const selectAllObservations = () => {
    if (observations) {
      setSelectedObservationIds(observations.map(o => o.id));
    }
  };

  const clearObservations = () => {
    setSelectedObservationIds([]);
  };

  const canGenerate = selectedStudyId || selectedObservationIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Persona Generator
          </DialogTitle>
          <DialogDescription>
            Generate a persona based on your research study and observations. Select a study
            and/or specific observations to inform the AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Study Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="study">Research Study (optional)</Label>
            {loadingStudies ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
                <SelectTrigger id="study">
                  <SelectValue placeholder="Select a study for context..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No study selected</SelectItem>
                  {studyPlans?.map((study) => (
                    <SelectItem key={study.id} value={study.id}>
                      {study.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              The study's problem statement and goals will guide persona generation
            </p>
          </div>

          {/* Observations Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Research Observations</Label>
              {observations && observations.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllObservations}
                    className="h-7 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearObservations}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
            
            {loadingObservations ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : observations && observations.length > 0 ? (
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {observations.map((obs) => (
                    <label
                      key={obs.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedObservationIds.includes(obs.id)}
                        onCheckedChange={() => toggleObservation(obs.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{obs.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground capitalize">
                            {obs.observation_type}
                          </span>
                          {obs.tags && obs.tags.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              • {obs.tags.slice(0, 2).join(', ')}
                              {obs.tags.length > 2 && ` +${obs.tags.length - 2}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-6 text-muted-foreground border rounded-md">
                <p className="text-sm">
                  {selectedStudyId 
                    ? "No observations found for this study" 
                    : "Select a study or create observations to use"}
                </p>
              </div>
            )}
            
            {selectedObservationIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedObservationIds.length} observation(s) selected
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!canGenerate || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Persona
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
