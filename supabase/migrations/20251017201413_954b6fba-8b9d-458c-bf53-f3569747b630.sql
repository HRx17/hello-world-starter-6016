-- Create table for UX study plans
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  problem_statement text NOT NULL,
  solution_goal text NOT NULL,
  ai_suggestions jsonb,
  research_methods text[],
  participant_criteria text,
  timeline text,
  status text DEFAULT 'planning',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for interview sessions
CREATE TABLE public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  participant_details jsonb,
  interview_guide jsonb,
  notes text,
  duration_minutes integer,
  status text DEFAULT 'scheduled',
  scheduled_at timestamptz,
  conducted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for research observations
CREATE TABLE public.research_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE,
  interview_session_id uuid REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  observation_type text NOT NULL,
  content text NOT NULL,
  tags text[],
  cluster_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for insight clusters (affinity mapping)
CREATE TABLE public.insight_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for personas
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_plan_id uuid REFERENCES public.study_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goals text[],
  pain_points text[],
  behaviors jsonb,
  demographics jsonb,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_plans
CREATE POLICY "Users can view their own study plans"
ON public.study_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study plans"
ON public.study_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans"
ON public.study_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans"
ON public.study_plans FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for interview_sessions
CREATE POLICY "Users can view their own interview sessions"
ON public.interview_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interview sessions"
ON public.interview_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions"
ON public.interview_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview sessions"
ON public.interview_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for research_observations
CREATE POLICY "Users can view their own research observations"
ON public.research_observations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research observations"
ON public.research_observations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research observations"
ON public.research_observations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research observations"
ON public.research_observations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for insight_clusters
CREATE POLICY "Users can view their own insight clusters"
ON public.insight_clusters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insight clusters"
ON public.insight_clusters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insight clusters"
ON public.insight_clusters FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insight clusters"
ON public.insight_clusters FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for personas
CREATE POLICY "Users can view their own personas"
ON public.personas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own personas"
ON public.personas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personas"
ON public.personas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personas"
ON public.personas FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_study_plans_updated_at
BEFORE UPDATE ON public.study_plans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON public.interview_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_research_observations_updated_at
BEFORE UPDATE ON public.research_observations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_insight_clusters_updated_at
BEFORE UPDATE ON public.insight_clusters
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_personas_updated_at
BEFORE UPDATE ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();