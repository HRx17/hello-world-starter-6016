import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function PersonaBuilder() {
  const { studyId, personaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = personaId === 'new';

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [painPointInput, setPainPointInput] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [techSavviness, setTechSavviness] = useState("");

  const { data: persona } = useQuery({
    queryKey: ['persona', personaId],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .single();
      
      if (error) throw error;
      
      // Load data into state
      setName(data.name);
      setDescription(data.description || "");
      setGoals(data.goals || []);
      setPainPoints(data.pain_points || []);
      
      if (data.demographics) {
        const demo = data.demographics as any;
        setAge(demo.age || "");
        setOccupation(demo.occupation || "");
        setTechSavviness(demo.tech_savviness || "");
      }
      
      return data;
    },
  });

  const savePersonaMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const personaData = {
        user_id: user.id,
        study_plan_id: studyId,
        name,
        description,
        goals,
        pain_points: painPoints,
        demographics: {
          age,
          occupation,
          tech_savviness: techSavviness,
        },
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('personas')
          .insert(personaData)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { error } = await supabase
          .from('personas')
          .update(personaData)
          .eq('id', personaId);
        
        if (error) throw error;
        return persona;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-personas', studyId] });
      queryClient.invalidateQueries({ queryKey: ['persona', personaId] });
      toast.success(isNew ? "Persona created!" : "Persona updated!");
      navigate(`/research/study/${studyId}`);
    },
    onError: () => {
      toast.error("Failed to save persona");
    },
  });

  const addGoal = () => {
    if (goalInput.trim()) {
      setGoals([...goals, goalInput.trim()]);
      setGoalInput("");
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const addPainPoint = () => {
    if (painPointInput.trim()) {
      setPainPoints([...painPoints, painPointInput.trim()]);
      setPainPointInput("");
    }
  };

  const removePainPoint = (index: number) => {
    setPainPoints(painPoints.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/research/study/${studyId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-4xl font-bold">{isNew ? 'Create Persona' : 'Edit Persona'}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Define the persona's core characteristics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sarah the Busy Professional"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A brief overview of this persona..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  placeholder="e.g., 28-35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="e.g., Marketing Manager"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tech">Tech Savviness</Label>
              <Input
                id="tech"
                placeholder="e.g., High - Early adopter of new technologies"
                value={techSavviness}
                onChange={(e) => setTechSavviness(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>What this persona wants to achieve</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a goal..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              />
              <Button onClick={addGoal} disabled={!goalInput.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{goal}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeGoal(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pain Points</CardTitle>
            <CardDescription>Challenges and frustrations this persona experiences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a pain point..."
                value={painPointInput}
                onChange={(e) => setPainPointInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPainPoint()}
              />
              <Button onClick={addPainPoint} disabled={!painPointInput.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {painPoints.map((pain, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{pain}</span>
                  <Button variant="ghost" size="icon" onClick={() => removePainPoint(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => navigate(`/research/study/${studyId}`)}>
            Cancel
          </Button>
          <Button onClick={() => savePersonaMutation.mutate()} disabled={!name.trim() || savePersonaMutation.isPending}>
            {savePersonaMutation.isPending ? "Saving..." : (isNew ? "Create Persona" : "Save Changes")}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}