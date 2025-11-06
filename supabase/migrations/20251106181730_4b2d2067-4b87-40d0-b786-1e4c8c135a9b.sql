-- Create mind_maps table
CREATE TABLE public.mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mind_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mind_maps
CREATE POLICY "Users can view their own mind maps"
  ON public.mind_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mind maps"
  ON public.mind_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mind maps"
  ON public.mind_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mind maps"
  ON public.mind_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Create information_architectures table
CREATE TABLE public.information_architectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.information_architectures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for information_architectures
CREATE POLICY "Users can view their own IAs"
  ON public.information_architectures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IAs"
  ON public.information_architectures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IAs"
  ON public.information_architectures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IAs"
  ON public.information_architectures FOR DELETE
  USING (auth.uid() = user_id);

-- Create user_journey_maps table
CREATE TABLE public.user_journey_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  journey_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_journey_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_journey_maps
CREATE POLICY "Users can view their own journey maps"
  ON public.user_journey_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own journey maps"
  ON public.user_journey_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey maps"
  ON public.user_journey_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journey maps"
  ON public.user_journey_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Create figma_exports table
CREATE TABLE public.figma_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  exported_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  figma_file_url TEXT,
  figma_file_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.figma_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for figma_exports
CREATE POLICY "Users can view their own figma exports"
  ON public.figma_exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own figma exports"
  ON public.figma_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own figma exports"
  ON public.figma_exports FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON public.mind_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_information_architectures_updated_at
  BEFORE UPDATE ON public.information_architectures
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_journey_maps_updated_at
  BEFORE UPDATE ON public.user_journey_maps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();