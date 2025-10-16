-- Fix infinite recursion in projects RLS policy
DROP POLICY IF EXISTS "Users can view their own and shared projects" ON public.projects;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view their own and shared projects"
ON public.projects
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_shares.project_id = projects.id 
    AND project_shares.shared_with_user_id = auth.uid()
  )
);

-- Ensure project_shares policies don't reference projects in a way that causes recursion
DROP POLICY IF EXISTS "Users can view shares where they are owner or shared with" ON public.project_shares;

CREATE POLICY "Users can view shares where they are owner or shared with"
ON public.project_shares
FOR SELECT
USING (
  shared_with_user_id = auth.uid()
  OR
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);