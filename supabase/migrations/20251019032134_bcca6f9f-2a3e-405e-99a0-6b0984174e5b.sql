-- Add default_heuristics column to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_heuristics JSONB DEFAULT '{"set": "nn_10", "custom": []}'::jsonb;

-- Update existing records to have the default heuristics value
UPDATE public.user_settings
SET default_heuristics = '{"set": "nn_10", "custom": []}'::jsonb
WHERE default_heuristics IS NULL;
