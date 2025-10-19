-- Phase 1: Add metadata column to website_crawls table for storing estimated time and other metadata
ALTER TABLE website_crawls 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_website_crawls_metadata ON website_crawls USING gin(metadata);