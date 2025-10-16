-- Create security definer function to check if user owns a project
CREATE OR REPLACE FUNCTION public.user_owns_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND user_id = _user_id
  )
$$;

-- Create security definer function to check if project is shared with user
CREATE OR REPLACE FUNCTION public.project_shared_with_user(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_shares
    WHERE project_id = _project_id
      AND shared_with_user_id = _user_id
  )
$$;

-- Fix project_shares policies to use security definer functions
DROP POLICY IF EXISTS "Project owners can create shares" ON public.project_shares;
CREATE POLICY "Project owners can create shares"
ON public.project_shares
FOR INSERT
WITH CHECK (public.user_owns_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Project owners can delete shares" ON public.project_shares;
CREATE POLICY "Project owners can delete shares"
ON public.project_shares
FOR DELETE
USING (public.user_owns_project(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view shares where they are owner or shared with" ON public.project_shares;
CREATE POLICY "Users can view shares where they are owner or shared with"
ON public.project_shares
FOR SELECT
USING (
  shared_with_user_id = auth.uid()
  OR
  public.user_owns_project(project_id, auth.uid())
);

-- Fix projects SELECT policy to use security definer function
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;
CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  public.project_shared_with_user(id, auth.uid())
);