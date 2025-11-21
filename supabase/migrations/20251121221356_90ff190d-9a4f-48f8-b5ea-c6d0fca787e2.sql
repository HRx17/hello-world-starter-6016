-- Phase 0 & 1: Create tables for screenshot analysis and custom heuristics

-- Screenshot analysis table
CREATE TABLE IF NOT EXISTS public.screenshot_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_storage_path TEXT,
  analysis_results JSONB DEFAULT '[]'::jsonb,
  score NUMERIC,
  violations JSONB DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom heuristic sets table
CREATE TABLE IF NOT EXISTS public.heuristic_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  heuristics JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.screenshot_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heuristic_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screenshot_analyses
CREATE POLICY "Users can create their own screenshot analyses"
  ON public.screenshot_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own screenshot analyses"
  ON public.screenshot_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own screenshot analyses"
  ON public.screenshot_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshot analyses"
  ON public.screenshot_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for heuristic_sets
CREATE POLICY "Users can create their own heuristic sets"
  ON public.heuristic_sets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own and public heuristic sets"
  ON public.heuristic_sets
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update their own heuristic sets"
  ON public.heuristic_sets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own heuristic sets"
  ON public.heuristic_sets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for screenshot uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots bucket
CREATE POLICY "Users can upload their own screenshots"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own screenshots"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own screenshots"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshot_analyses_user_id ON public.screenshot_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_analyses_project_id ON public.screenshot_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_analyses_created_at ON public.screenshot_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_heuristic_sets_user_id ON public.heuristic_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_heuristic_sets_public ON public.heuristic_sets(is_public) WHERE is_public = true;