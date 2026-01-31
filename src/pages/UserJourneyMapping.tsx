import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, FileDown, Folder, ChevronRight } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { downloadJSON, downloadHTML, generateJourneyHTML } from "@/lib/exportHelpers";
import { JourneyCanvas } from "@/components/journey/JourneyCanvas";
import { StageEditPanel } from "@/components/journey/StageEditPanel";
import { JourneyStage, JourneyMapData } from "@/components/journey/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function UserJourneyMapping() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studyId = searchParams.get('studyId');
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  const selectedStage = stages.find(s => s.id === selectedStageId) || null;

  const { data: journeys, isLoading } = useQuery({
    queryKey: ['user-journey-maps', studyId],
    queryFn: async () => {
      const query = supabase
        .from('user_journey_maps')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (studyId) {
        query.eq('study_plan_id', studyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: personas } = useQuery({
    queryKey: ['personas', studyId],
    queryFn: async () => {
      const query = supabase
        .from('personas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (studyId) {
        query.eq('study_plan_id', studyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleUpdateStage = (updatedStage: JourneyStage) => {
    setStages(stages.map(s => s.id === updatedStage.id ? updatedStage : s));
  };

  const handleRemoveConnection = (fromId: string, toId: string) => {
    setStages(stages.map(s => 
      s.id === fromId 
        ? { ...s, nextStages: s.nextStages.filter(id => id !== toId) }
        : s
    ));
    toast.success("Connection removed");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const journeyData: JourneyMapData = {
        title: title || 'User Journey Map',
        persona: selectedPersonaId,
        stages: stages
      };

      const { error } = await supabase
        .from('user_journey_maps')
        .insert({
          user_id: user.id,
          study_plan_id: studyId || null,
          persona_id: selectedPersonaId || null,
          title: title || 'User Journey Map',
          journey_data: journeyData,
          ai_generated: false,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-journey-maps', studyId] });
      toast.success("Journey map saved!");
    },
    onError: () => {
      toast.error("Failed to save journey map");
    },
  });

  const handleDownloadJSON = () => {
    const journeyData: JourneyMapData = {
      title: title || 'User Journey Map',
      stages: stages
    };
    downloadJSON(journeyData, `user-journey-${Date.now()}.json`);
  };

  const handleDownloadHTML = () => {
    // Convert new stage format to old format for HTML export
    const legacyStages = stages.map(s => ({
      id: s.id,
      name: s.name,
      actions: s.actions,
      touchpoints: s.touchpoints,
      thoughts: s.thoughts,
      painPoints: s.painPoints,
      opportunities: s.opportunities,
      emotionLevel: s.emotionLevel,
    }));
    const journeyData = {
      title: title || 'User Journey Map',
      stages: legacyStages
    };
    const html = generateJourneyHTML(journeyData);
    downloadHTML(html, `user-journey-${Date.now()}.html`);
  };

  const loadJourney = (journey: any) => {
    if (journey.journey_data?.stages) {
      // Handle both old and new stage formats
      const loadedStages = journey.journey_data.stages.map((s: any, index: number) => ({
        id: s.id || Date.now().toString() + index,
        name: s.name,
        description: s.description || "",
        actions: s.actions || [],
        touchpoints: s.touchpoints || [],
        thoughts: s.thoughts || [],
        painPoints: s.painPoints || [],
        opportunities: s.opportunities || [],
        emotionLevel: s.emotionLevel || 3,
        position: s.position || { x: 100 + index * 280, y: 200 },
        nextStages: s.nextStages || (index < journey.journey_data.stages.length - 1 
          ? [journey.journey_data.stages[index + 1]?.id || (Date.now().toString() + (index + 1))]
          : []),
        type: s.type || 'action',
        branchLabels: s.branchLabels || {},
      }));
      
      setStages(loadedStages);
      setTitle(journey.journey_data.title || journey.title);
      setSelectedPersonaId(journey.persona_id || '');
      setSelectedStageId(null);
      toast.success("Journey loaded!");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/research')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">User Journey Mapping</h1>
              <p className="text-sm text-muted-foreground">
                Build visual journey maps with branching paths
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Journey title..."
                className="w-48"
              />
              <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Persona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No persona</SelectItem>
                  {personas?.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedPanel(!showSavedPanel)}
            >
              <Folder className="h-4 w-4 mr-1" />
              Saved
            </Button>

            <ExportDialog
              data={{ title, stages }}
              title="User Journey Map"
              exportType="user_journey_map"
              onDownloadJSON={handleDownloadJSON}
              onDownloadHTML={handleDownloadHTML}
              disabled={stages.length === 0}
            />

            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || stages.length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 relative">
            <JourneyCanvas
              stages={stages}
              onStagesChange={setStages}
              selectedStageId={selectedStageId}
              onSelectStage={setSelectedStageId}
            />
          </div>

          {/* Saved journeys panel */}
          {showSavedPanel && (
            <div className="w-72 border-l bg-background p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Saved Journeys</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavedPanel(false)}
                >
                  ×
                </Button>
              </div>
              
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : journeys && journeys.length > 0 ? (
                <div className="space-y-2">
                  {journeys.map((journey) => (
                    <Card
                      key={journey.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => loadJourney(journey)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm">{journey.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(journey.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No saved journeys yet</p>
              )}
            </div>
          )}
        </div>

        {/* Stage edit panel */}
        <StageEditPanel
          stage={selectedStage}
          allStages={stages}
          open={!!selectedStage}
          onClose={() => setSelectedStageId(null)}
          onUpdate={handleUpdateStage}
          onRemoveConnection={handleRemoveConnection}
        />
      </div>
    </DashboardLayout>
  );
}
