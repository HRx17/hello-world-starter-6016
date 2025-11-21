import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon, Link, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HeuristicsSelector } from "@/components/HeuristicsSelector";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";

export default function ScreenshotAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [heuristicConfig, setHeuristicConfig] = useState<{ set: string; custom?: string[] }>({ set: "nn_10" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, WebP)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl) {
      toast({
        title: "URL required",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    setImagePreview(imageUrl);
    setSelectedFile(null);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) {
      toast({
        title: "No image selected",
        description: "Please upload an image or provide a URL",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to analyze screenshots",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsAnalyzing(true);

    try {
      let storagePath = "";
      let publicUrl = imagePreview;

      // Upload file if it's a local file
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('screenshots')
          .upload(fileName, selectedFile, {
            contentType: selectedFile.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        storagePath = fileName;
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(fileName);
        
        publicUrl = urlData.publicUrl;
      }

      // Call analysis edge function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-screenshot',
        {
          body: {
            imageUrl: imagePreview,
            heuristics: heuristicConfig.custom || undefined
          }
        }
      );

      if (analysisError) throw analysisError;
      if (!analysisData.success) throw new Error(analysisData.error);

      // Save to database
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('screenshot_analyses')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          image_storage_path: storagePath,
          score: analysisData.score,
          violations: analysisData.violations,
          strengths: analysisData.strengths,
          analysis_results: analysisData
        })
        .select()
        .single();

      if (saveError) throw saveError;

      toast({
        title: "Analysis complete!",
        description: `Usability score: ${analysisData.score}/100`,
      });

      // Navigate to results
      navigate(`/screenshot-results/${savedAnalysis.id}`);

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze screenshot",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <DashboardLayout>
        <LoadingAnalysis />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Screenshot Analysis
          </h1>
          <p className="text-muted-foreground">
            Upload a design screenshot or provide an image URL for AI-powered usability evaluation
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Design
              </CardTitle>
              <CardDescription>
                Select an image file or paste a URL to your design screenshot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="url">
                    <Link className="h-4 w-4 mr-2" />
                    Image URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileSelect}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG or WebP (max 10MB)
                      </p>
                    </label>
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ {selectedFile.name} selected
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-url">Image URL</Label>
                    <Input
                      id="image-url"
                      type="url"
                      placeholder="https://example.com/design.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleUrlSubmit} className="w-full">
                    Load Image
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                <HeuristicsSelector
                  value={heuristicConfig}
                  onChange={setHeuristicConfig}
                />
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!imagePreview || isAnalyzing}
                className="w-full mt-6"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Design
              </Button>
            </CardContent>
          </Card>

          {/* Right Column - Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Your design will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={imagePreview}
                    alt="Design preview"
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No image selected</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}