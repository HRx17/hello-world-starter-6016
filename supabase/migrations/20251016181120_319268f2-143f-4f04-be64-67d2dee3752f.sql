-- Add framework field to projects table
ALTER TABLE public.projects 
ADD COLUMN framework text;

-- Create table for comparative analyses
CREATE TABLE public.comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  project_ids uuid[] NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on comparisons
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comparisons
CREATE POLICY "Users can view their own comparisons"
  ON public.comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparisons"
  ON public.comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
  ON public.comparisons FOR DELETE
  USING (auth.uid() = user_id);