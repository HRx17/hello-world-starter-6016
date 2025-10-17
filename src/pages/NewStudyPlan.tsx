import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function NewStudyPlan() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [solutionGoal, setSolutionGoal] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generateSuggestions = async () => {
    if (!problemStatement || !solutionGoal) {
      toast.error("Please fill in problem statement and solution goal first");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: { problemStatement, solutionGoal }
      });

      if (error) throw error;
      setAiSuggestions(data.studyPlan);
      toast.success("AI suggestions generated!");
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error("Failed to generate suggestions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title || !problemStatement || !solutionGoal) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          title,
          problem_statement: problemStatement,
          solution_goal: solutionGoal,
          ai_suggestions: aiSuggestions ? { suggestions: aiSuggestions } : null,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Study plan created!");
      navigate(`/research/study/${data.id}`);
    } catch (error) {
      console.error('Error saving study plan:', error);
      toast.error("Failed to save study plan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold">New Study Plan</h1>
          <p className="text-muted-foreground mt-2">Define your research goals and get AI-powered suggestions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Study Details</CardTitle>
            <CardDescription>Provide information about your research study</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Study Title *</Label>
              <Input
                id="title"
                placeholder="E.g., Mobile App Onboarding Research"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem">Problem Statement *</Label>
              <Textarea
                id="problem"
                placeholder="Describe the problem you're trying to solve..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Solution Goal *</Label>
              <Textarea
                id="goal"
                placeholder="What do you hope to achieve with this research?"
                value={solutionGoal}
                onChange={(e) => setSolutionGoal(e.target.value)}
                rows={4}
              />
            </div>

            <Button 
              onClick={generateSuggestions} 
              disabled={isGenerating || !problemStatement || !solutionGoal}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating AI Suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Study Plan Suggestions
                </>
              )}
            </Button>

            {aiSuggestions && (
              <div className="space-y-2">
                <Label>AI Suggestions</Label>
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="whitespace-pre-wrap text-sm">{aiSuggestions}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => navigate('/research')}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Create Study Plan"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}