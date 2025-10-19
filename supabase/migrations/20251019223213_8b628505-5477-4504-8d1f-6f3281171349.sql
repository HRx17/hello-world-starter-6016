-- Migration to fix orphaned website_crawls and ensure all crawls are linked to projects

-- Step 1: Create projects for orphaned crawls that don't have matching projects
INSERT INTO projects (user_id, url, name, created_at)
SELECT DISTINCT 
  wc.user_id,
  wc.url,
  substring(wc.url from 'https?://([^/]+)') as name,
  MIN(wc.created_at) as created_at
FROM website_crawls wc
WHERE wc.project_id IS NULL 
  AND wc.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.url = wc.url AND p.user_id = wc.user_id
  )
GROUP BY wc.user_id, wc.url;

-- Step 2: Link orphaned crawls to their projects (exact URL match)
UPDATE website_crawls wc
SET project_id = p.id
FROM projects p
WHERE wc.project_id IS NULL
  AND wc.url = p.url
  AND wc.user_id = p.user_id;