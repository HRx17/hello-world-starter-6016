-- Create table for website crawl jobs
CREATE TABLE IF NOT EXISTS public.website_crawls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, crawling, analyzing, completed, failed
  total_pages INTEGER DEFAULT 0,
  crawled_pages INTEGER DEFAULT 0,
  analyzed_pages INTEGER DEFAULT 0,
  firecrawl_job_id TEXT,
  overall_score NUMERIC,
  aggregate_violations JSONB DEFAULT '[]'::jsonb,
  aggregate_strengths JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create table for individual page analysis results
CREATE TABLE IF NOT EXISTS public.page_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_id UUID NOT NULL REFERENCES public.website_crawls(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_type TEXT, -- homepage, product, checkout, listing, etc.
  screenshot TEXT,
  score NUMERIC,
  violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  html_snapshot TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.website_crawls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for website_crawls
CREATE POLICY "Users can view their own website crawls"
  ON public.website_crawls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own website crawls"
  ON public.website_crawls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own website crawls"
  ON public.website_crawls FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own website crawls"
  ON public.website_crawls FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for page_analyses
CREATE POLICY "Users can view page analyses for their crawls"
  ON public.page_analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.website_crawls
      WHERE id = page_analyses.crawl_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create page analyses for their crawls"
  ON public.page_analyses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.website_crawls
      WHERE id = page_analyses.crawl_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_website_crawls_user_id ON public.website_crawls(user_id);
CREATE INDEX idx_website_crawls_status ON public.website_crawls(status);
CREATE INDEX idx_page_analyses_crawl_id ON public.page_analyses(crawl_id);
CREATE INDEX idx_page_analyses_page_type ON public.page_analyses(page_type);

-- Create trigger for updated_at
CREATE TRIGGER update_website_crawls_updated_at
  BEFORE UPDATE ON public.website_crawls
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
