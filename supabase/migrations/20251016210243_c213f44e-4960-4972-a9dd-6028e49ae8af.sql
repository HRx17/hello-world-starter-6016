-- Create user_settings table for user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_framework TEXT,
  email_notifications BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create project_shares table for team collaboration
CREATE TABLE IF NOT EXISTS public.project_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_shares
CREATE POLICY "Users can view shares where they are owner or shared with"
ON public.project_shares
FOR SELECT
USING (
  shared_with_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_shares.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can create shares"
ON public.project_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_shares.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete shares"
ON public.project_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_shares.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Update projects RLS to include shared projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  user_id = auth.uid() OR
  id IN (
    SELECT project_id FROM public.project_shares
    WHERE shared_with_user_id = auth.uid()
  )
);

-- Create comments table for violation discussions
CREATE TABLE IF NOT EXISTS public.violation_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.analysis_results(id) ON DELETE CASCADE,
  violation_index INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.violation_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view comments on their projects"
ON public.violation_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.analysis_results ar
    JOIN public.projects p ON ar.project_id = p.id
    WHERE ar.id = violation_comments.analysis_id
    AND (p.user_id = auth.uid() OR p.id IN (
      SELECT project_id FROM public.project_shares
      WHERE shared_with_user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create comments on shared projects"
ON public.violation_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.analysis_results ar
    JOIN public.projects p ON ar.project_id = p.id
    WHERE ar.id = violation_comments.analysis_id
    AND (p.user_id = auth.uid() OR p.id IN (
      SELECT project_id FROM public.project_shares
      WHERE shared_with_user_id = auth.uid()
    ))
  )
);

-- Trigger for updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on violation_comments
CREATE TRIGGER update_violation_comments_updated_at
BEFORE UPDATE ON public.violation_comments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();