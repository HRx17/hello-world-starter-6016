-- Create table for Figma plugin connections/API keys
CREATE TABLE public.figma_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connect_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  name text DEFAULT 'My Figma Connection',
  is_active boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create table for imported flows from Figma
CREATE TABLE public.figma_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.figma_connections(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  screenshots jsonb DEFAULT '[]'::jsonb,
  figma_file_key text,
  figma_file_name text,
  status text DEFAULT 'imported',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.figma_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figma_flows ENABLE ROW LEVEL SECURITY;

-- RLS policies for figma_connections
CREATE POLICY "Users can view their own connections"
  ON public.figma_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
  ON public.figma_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON public.figma_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.figma_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for figma_flows
CREATE POLICY "Users can view their own flows"
  ON public.figma_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows"
  ON public.figma_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows"
  ON public.figma_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows"
  ON public.figma_flows FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get user_id from connect_key (for edge function auth)
CREATE OR REPLACE FUNCTION public.get_user_from_connect_key(key text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.figma_connections 
  WHERE connect_key = key AND is_active = true
  LIMIT 1
$$;