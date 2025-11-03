import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, X, FileText, Users, Target } from "lucide-react";

const STUDY_TEMPLATES = [
  {
    id: "usability",
    title: "Usability Testing",
    icon: Target,
    problem: "Users are experiencing difficulty completing key tasks in our product",
    goal: "Identify usability issues and improve task completion rates",
    methods: ["User Testing", "Think-Aloud Protocol"],
  },
  {
    id: "discovery",
    title: "User Research Discovery",
    icon: Users,
    problem: "We need to understand user needs and pain points before designing solutions",
    goal: "Discover user needs, behaviors, and motivations to inform product direction",
    methods: ["User Interviews", "Contextual Inquiry"],
  },
  {
    id: "validation",
    title: "Concept Validation",
    icon: FileText,
    problem: "We have a new concept and need to validate it with real users",
    goal: "Test and validate product concepts before investing in development",
    methods: ["Prototype Testing", "User Interviews"],
  },
];

export default function NewStudyPlan() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [solutionGoal, setSolutionGoal] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [autoConvertToSteps, setAutoConvertToSteps] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    const template = STUDY_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTitle(template.title);
      setProblemStatement(template.problem);
      setSolutionGoal(template.goal);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

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

      let planSteps = null;
      
      // Auto-convert AI suggestions to steps if enabled
      if (autoConvertToSteps && aiSuggestions) {
        try {
          const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-ai-to-steps', {
            body: { aiText: aiSuggestions }
          });
          
          if (!parseError && parsedData?.steps) {
            planSteps = parsedData.steps;
          }
        } catch (parseError) {
          console.error('Error parsing AI to steps:', parseError);
          // Continue without steps
        }
      }

      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          title,
          problem_statement: problemStatement,
          solution_goal: solutionGoal,
          tags: tags.length > 0 ? tags : null,
          ai_suggestions: aiSuggestions ? { suggestions: aiSuggestions } : null,
          plan_steps: planSteps,
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

        {!selectedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Template</CardTitle>
              <CardDescription>Start with a template or create from scratch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {STUDY_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardHeader>
                        <Icon className="h-8 w-8 mb-2 text-primary" />
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" className="w-full mt-4" onClick={() => setSelectedTemplate("custom")}>
                Start from Scratch
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedTemplate && (
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

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                )}
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
                <div className="space-y-3">
                  <Label>AI Suggestions</Label>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="whitespace-pre-wrap text-sm">{aiSuggestions}</div>
                    </CardContent>
                  </Card>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="autoConvert" 
                      checked={autoConvertToSteps}
                      onCheckedChange={(checked) => setAutoConvertToSteps(checked as boolean)}
                    />
                    <Label htmlFor="autoConvert" className="text-sm font-normal cursor-pointer">
                      Automatically convert AI suggestions to study plan steps
                    </Label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                {selectedTemplate && (
                  <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
                    Back to Templates
                  </Button>
                )}
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
        )}
      </div>
    </DashboardLayout>
  );
}