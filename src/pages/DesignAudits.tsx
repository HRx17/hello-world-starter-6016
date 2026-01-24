import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Play, User, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DesignAuditResults } from "@/components/DesignAuditResults";

interface FrictionPoint {
  id: number;
  x: number;
  y: number;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface SimulationResult {
  frictionPoints: FrictionPoint[];
  monologue: string;
  personaName: string;
}

export default function DesignAudits() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch user's personas
  const { data: personas, isLoading: personasLoading } = useQuery({
    queryKey: ["personas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG or JPG image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setSimulationResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const selectedPersona = personas?.find(p => p.id === selectedPersonaId);

  const runSimulation = async () => {
    if (!selectedFile || !selectedPersona || !imagePreview) {
      toast({
        title: "Missing requirements",
        description: "Please upload a mockup and select a persona.",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-persona-audit", {
        body: {
          imageData: imagePreview,
          persona: {
            name: selectedPersona.name,
            description: selectedPersona.description,
            painPoints: selectedPersona.pain_points,
            goals: selectedPersona.goals,
            behaviors: selectedPersona.behaviors,
            demographics: selectedPersona.demographics,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setSimulationResult({
          frictionPoints: data.frictionPoints,
          monologue: data.monologue,
          personaName: selectedPersona.name,
        });
        toast({
          title: "Simulation complete",
          description: `Found ${data.frictionPoints.length} friction points for ${selectedPersona.name}.`,
        });
      } else {
        throw new Error(data.error || "Simulation failed");
      }
    } catch (error: any) {
      console.error("Simulation error:", error);
      toast({
        title: "Simulation failed",
        description: error.message || "Failed to run persona simulation.",
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setSelectedPersonaId("");
    setSimulationResult(null);
  };

  return (
    <DashboardLayout>
      <div className="w-full p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Design Audits
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload mockups and simulate how your personas would interact with the design.
          </p>
        </div>

        {simulationResult ? (
          <DesignAuditResults
            imageUrl={imagePreview!}
            result={simulationResult}
            onReset={resetSimulation}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Mockups
                </CardTitle>
                <CardDescription>
                  Drag and drop your design screenshots (PNG/JPG)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`
                    relative border-2 border-dashed rounded-lg p-8
                    flex flex-col items-center justify-center
                    min-h-[300px] transition-all duration-200 cursor-pointer
                    ${isDragOver 
                      ? "border-primary bg-primary/5" 
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    }
                    ${imagePreview ? "p-4" : ""}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  
                  {imagePreview ? (
                    <div className="w-full">
                      <img
                        src={imagePreview}
                        alt="Uploaded mockup"
                        className="w-full h-auto max-h-[400px] object-contain rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground mt-4 text-center">
                        {selectedFile?.name} • Click to replace
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        Drop your mockup here
                      </p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-4">
                        Supports PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Simulation Settings
                </CardTitle>
                <CardDescription>
                  Select a persona to simulate their interaction with the design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Persona Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link to Persona</label>
                  <Select
                    value={selectedPersonaId}
                    onValueChange={setSelectedPersonaId}
                    disabled={personasLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a persona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personas?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No personas found. Create one in Research → Personas.
                        </div>
                      ) : (
                        personas?.map((persona) => (
                          <SelectItem key={persona.id} value={persona.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{persona.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Persona Preview */}
                {selectedPersona && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{selectedPersona.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {selectedPersona.description || "No description"}
                          </p>
                          {selectedPersona.pain_points && selectedPersona.pain_points.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Frustrations:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selectedPersona.pain_points.slice(0, 3).map((point: string, i: number) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded"
                                  >
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Simulation Info */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        How Simulation Works
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The AI will analyze your design as if it were the selected persona,
                        identifying friction points based on their traits and frustrations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Run Button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={runSimulation}
                  disabled={!selectedFile || !selectedPersonaId || isSimulating}
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
