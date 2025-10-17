-- Add plan_steps field to study_plans table
ALTER TABLE public.study_plans 
ADD COLUMN plan_steps jsonb DEFAULT '[]'::jsonb;