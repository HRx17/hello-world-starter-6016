-- Phase 1A: Database Schema Enhancements for UX Research

-- Add columns to study_plans table
ALTER TABLE public.study_plans
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Add columns to personas table for source tracking
ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS source_observation_ids uuid[],
ADD COLUMN IF NOT EXISTS source_interview_ids uuid[];

-- Add summary column to insight_clusters
ALTER TABLE public.insight_clusters
ADD COLUMN IF NOT EXISTS summary text;

-- Create step_notes table for persisting workspace notes
CREATE TABLE IF NOT EXISTS public.step_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  study_plan_id uuid NOT NULL,
  step_id text NOT NULL,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(study_plan_id, step_id)
);

-- Enable RLS on step_notes
ALTER TABLE public.step_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for step_notes
CREATE POLICY "Users can view their own step notes"
ON public.step_notes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own step notes"
ON public.step_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own step notes"
ON public.step_notes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own step notes"
ON public.step_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on step_notes
CREATE TRIGGER update_step_notes_updated_at
BEFORE UPDATE ON public.step_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_step_notes_study_plan_id ON public.step_notes(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_step_notes_user_id ON public.step_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_archived_at ON public.study_plans(archived_at);
CREATE INDEX IF NOT EXISTS idx_study_plans_tags ON public.study_plans USING gin(tags);