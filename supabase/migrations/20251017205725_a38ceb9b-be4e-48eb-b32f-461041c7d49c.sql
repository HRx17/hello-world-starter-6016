-- Add INSERT policy to profiles table to prevent unauthorized profile creation
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add UPDATE policy to analysis_results if users should be able to edit their results
CREATE POLICY "Users can update their own analysis results" 
ON public.analysis_results 
FOR UPDATE 
USING (auth.uid() = user_id);