-- Create an edge function to parse AI suggestions into steps
CREATE OR REPLACE FUNCTION public.parse_ai_suggestions_to_steps(ai_text text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  steps jsonb := '[]'::jsonb;
BEGIN
  -- This is a placeholder function that returns empty array
  -- The actual parsing will be done in the Edge Function
  RETURN steps;
END;
$$;