# Comprehensive Logging Guide

This document explains all the logs you'll see when running the UX Heuristic Analysis Tool in VS Code.

## Log Types & Emoji Guide

### Frontend Logs (Browser Console & VS Code Terminal)

| Emoji | Type | Description |
|-------|------|-------------|
| 🎯 | Flow Control | Indicates a major step in the user flow |
| 🚀 | Initiation | Starting a process or function |
| ✅ | Success | Operation completed successfully |
| ❌ | Error | Operation failed or encountered an error |
| 📊 | Data/Config | Configuration settings or data being used |
| 📡 | API Call | Making a request to backend/edge function |
| 📥 | Response | Received response from backend |
| 💾 | Database | Database operations (read/write) |
| 🔄 | Refresh/Retry | Retrying or restarting an operation |
| 📈 | Progress | Progress updates during long operations |
| 🔍 | Check/Query | Polling or checking status |
| ⏱️ | Timing | Time-based operations |
| 🛑 | Cleanup | Cleaning up resources |

### Backend Logs (Edge Functions)

Backend logs use clear text with visual separators:

```
============================================================
PROFESSIONAL-GRADE MULTI-STAGE HEURISTIC EVALUATION
============================================================
```

## Complete Analysis Flow Example

### 1. Single Page Analysis

#### Frontend Logs:
```
🎯 [FRONTEND] Form submitted - Starting analysis flow
📋 [FRONTEND] Analysis type: single
🌐 [FRONTEND] URL: https://example.com
✅ [FRONTEND] URL validation passed
➡️ [FRONTEND] Executing single-page analysis
🚀 [FRONTEND] Starting single-page analysis for: https://example.com
📊 [FRONTEND] Using heuristics: {set: "nn_10", custom: []}
📡 [FRONTEND] Invoking analyze-website edge function...
📥 [FRONTEND] Received response from backend: {...}
✅ [FRONTEND] Analysis data received: {
  score: 85,
  violations: 5,
  strengths: 8,
  screenshot: true
}
💾 [FRONTEND] Saving results to database for user: abc-123
📝 [FRONTEND] Inserting analysis result for project: xyz-456
✅ [FRONTEND] Analysis saved to database
🔄 [FRONTEND] Navigating to results page
✅ [FRONTEND] Analysis/Crawl initiated successfully
```

#### Backend Edge Function Logs:
```
============================================================
PROFESSIONAL-GRADE MULTI-STAGE HEURISTIC EVALUATION
============================================================
URL: https://example.com
Heuristics config: {set: "nn_10", custom: []}

[STEP 0] Scraping website with Firecrawl...
✓ Scraping complete

[STAGE 1] Deep Visual Decomposition...
✓ Stage 1 complete

[STAGE 2] Structural Analysis...
✓ Stage 2 complete

[STAGE 3] Per-Heuristic Evaluation (10 focused analyses)...
  Evaluating 10 heuristics...
✓ Stage 3 complete: 15 violations, 12 strengths

[STAGE 4] Cross-Validation & Deduplication...
✓ Stage 4 complete: 5 validated violations
  Removed: 8 duplicates, 2 false positives

[STAGE 5] Research-Backed Scoring...
✓ Stage 5 complete: Final score 85/100

============================================================
ANALYSIS COMPLETE
============================================================
Total violations: 5
Total strengths: 12
Final score: 85/100
Industry percentile: Top 35% - Above Average UX
============================================================
```

### 2. Full Website Crawl

#### Frontend Logs:
```
🎯 [FRONTEND] Form submitted - Starting analysis flow
📋 [FRONTEND] Analysis type: full
🌐 [FRONTEND] URL: https://example.com
✅ [FRONTEND] URL validation passed
➡️ [FRONTEND] Executing full website crawl
🚀 [FRONTEND] Starting full website crawl for: https://example.com
📊 [FRONTEND] Crawl mode: light
🔍 [FRONTEND] Finding or creating project...
✅ [FRONTEND] Project ID: project-abc-123
📡 [FRONTEND] Invoking start-website-crawl edge function...
📥 [FRONTEND] Crawl response: {
  success: true,
  crawlId: "crawl-xyz-789"
}
✅ [FRONTEND] Crawl started successfully with ID: crawl-xyz-789
✅ [FRONTEND] Analysis/Crawl initiated successfully
🔄 [FRONTEND] Starting crawl status polling for ID: crawl-xyz-789
⏱️ [FRONTEND] Poll interval started (every 3 seconds)

🔍 [FRONTEND] Poll #1 - Checking crawl status...
📡 [FRONTEND] Invoking check-crawl-status...
📊 [FRONTEND] Crawl status received: {
  status: "crawling",
  crawled: 5,
  analyzed: 0,
  total: 50
}

🔍 [FRONTEND] Poll #2 - Checking crawl status...
📡 [FRONTEND] Invoking check-crawl-status...
📊 [FRONTEND] Crawl status received: {
  status: "crawling",
  crawled: 12,
  analyzed: 0,
  total: 50
}
📈 [FRONTEND] Progress updated: 5 -> 12

... (polling continues every 3 seconds) ...

🔍 [FRONTEND] Poll #45 - Checking crawl status...
📡 [FRONTEND] Invoking check-crawl-status...
📊 [FRONTEND] Crawl status received: {
  status: "analyzing",
  crawled: 50,
  analyzed: 25,
  total: 50
}
📈 [FRONTEND] Progress updated: 50 -> 75

... (polling continues) ...

🔍 [FRONTEND] Poll #60 - Checking crawl status...
📡 [FRONTEND] Invoking check-crawl-status...
📊 [FRONTEND] Crawl status received: {
  status: "completed",
  crawled: 50,
  analyzed: 50,
  total: 50
}
✅ [FRONTEND] Crawl completed successfully!
🛑 [FRONTEND] Cleaning up poll interval
```

#### Backend Edge Function Logs (start-website-crawl):
```
Starting full website crawl for: https://example.com with mode: light
User: user-123 Project: project-456
Initiating Firecrawl crawl with light mode: 50 pages max, depth 2
Firecrawl job started: firecrawl-job-abc
Crawl job created: crawl-xyz-789
```

#### Backend Edge Function Logs (check-crawl-status):
```
Checking crawl status for: crawl-xyz-789
Firecrawl status: scraping
Firecrawl initial response - Status: scraping Completed: 5 Total: 50

... (logs continue with each status check) ...

Checking crawl status for: crawl-xyz-789
Firecrawl status: completed
✅ All data fetched! Total pages: 50
✅ Crawl ready for analysis! Total pages crawled: 50
[Starting analysis of 50 pages...]
```

## Error Scenarios

### 1. Invalid URL
```
🎯 [FRONTEND] Form submitted - Starting analysis flow
📋 [FRONTEND] Analysis type: single
🌐 [FRONTEND] URL: not-a-url
❌ [FRONTEND] Invalid URL format
```

### 2. API Key Missing
```
🚀 [FRONTEND] Starting single-page analysis for: https://example.com
📡 [FRONTEND] Invoking analyze-website edge function...
❌ [FRONTEND] Backend error: {message: "FIRECRAWL_API_KEY not configured"}
❌ [FRONTEND] Analysis error: Error: FIRECRAWL_API_KEY not configured
```

### 3. Rate Limit Exceeded
```
🚀 [FRONTEND] Starting full website crawl for: https://example.com
📡 [FRONTEND] Invoking start-website-crawl edge function...
❌ [FRONTEND] Crawl error: Error: rate limit
❌ [FRONTEND] Rate limit error detected
```

### 4. Crawl Timeout
```
🔍 [FRONTEND] Poll #401 - Checking crawl status...
❌ [FRONTEND] Polling timeout after 1203 seconds
```

### 5. Crawl Stuck (Auto-Restart)
```
🔄 [FRONTEND] Backend signaled restart needed due to error
🔄 [FRONTEND] Executing auto-restart...
🔄 [FRONTEND] Marking old crawl as error...
⏱️ [FRONTEND] Waiting 2 seconds before restart...
🚀 [FRONTEND] Restarting crawl...
✅ [FRONTEND] Auto-restart successful
```

## Debugging Tips

### Finding Specific Logs

#### In Browser DevTools:
1. Open DevTools (F12)
2. Go to Console tab
3. Use filter:
   - Type `[FRONTEND]` to see only frontend logs
   - Type `❌` to see only errors
   - Type `✅` to see only successes
   - Type a specific function like `analyze-website` to filter

#### In VS Code Terminal:
- Frontend dev server logs appear where you ran `npm run dev`
- Look for the colored emoji prefixes
- Scroll up to see earlier logs

#### In Supabase Logs:
```bash
# All edge function logs
supabase functions logs

# Specific function
supabase functions logs analyze-website

# Follow logs in real-time
supabase functions logs --tail

# Search for specific text
supabase functions logs | grep "error"
```

### Common Issues & Their Logs

#### Issue: Analysis Takes Forever

**Look for:**
```
🔍 [FRONTEND] Poll #X - Checking crawl status...
```

If X keeps increasing with no progress updates (`📈`), the crawl is stuck.

**Check backend logs:**
```bash
supabase functions logs check-crawl-status --tail
```

Look for: `Firecrawl appears stuck`

#### Issue: No Results After Analysis

**Check for:**
```
✅ [FRONTEND] Analysis data received: {score: undefined, violations: 0, ...}
```

This means the backend returned empty data.

**Check backend logs:**
```bash
supabase functions logs analyze-website
```

Look for errors in STAGE 3, 4, or 5.

#### Issue: Database Save Failed

**Look for:**
```
💾 [FRONTEND] Saving results to database for user: ...
❌ [FRONTEND] Error: ...
```

Usually means RLS policy issue or network problem.

#### Issue: Edge Function Not Found

**Look for:**
```
📡 [FRONTEND] Invoking analyze-website edge function...
❌ [FRONTEND] Backend error: {message: "Function not found"}
```

**Solution:**
```bash
supabase functions deploy analyze-website
```

## Performance Monitoring

### Single Page Analysis
- **Expected time**: 20-30 seconds
- **Key stages**:
  - Scraping: 3-5 seconds
  - Visual decomposition: 8-12 seconds
  - Heuristic evaluation: 10-15 seconds

**Look for:**
```
[STEP 0] Scraping... ✓ (5s)
[STAGE 1] Visual... ✓ (10s)
[STAGE 2] Structural... ✓ (1s)
[STAGE 3] Heuristics... ✓ (12s)
[STAGE 4] Validation... ✓ (1s)
[STAGE 5] Scoring... ✓ (1s)
```

### Full Website Crawl
- **Expected time**: 1-10 minutes (depends on page count)
- **Progress updates**: Every 3 seconds

**Monitor:**
```
📈 [FRONTEND] Progress updated: 0 -> 10
📈 [FRONTEND] Progress updated: 10 -> 25
📈 [FRONTEND] Progress updated: 25 -> 40
```

If no progress for > 30 seconds, something's wrong.

## Advanced Debugging

### Enable Verbose Logging

Add to your `.env`:
```
VITE_DEBUG=true
```

### Network Tab Analysis

In Browser DevTools > Network:
1. Filter by "Fetch/XHR"
2. Look for requests to:
   - `functions/v1/analyze-website`
   - `functions/v1/start-website-crawl`
   - `functions/v1/check-crawl-status`
3. Check:
   - Request payload
   - Response status
   - Response body
   - Time taken

### Database Queries

Monitor real-time database activity:
```sql
-- Check crawl status directly
SELECT id, status, crawled_pages, analyzed_pages, total_pages, error_message
FROM website_crawls
WHERE id = 'your-crawl-id'
ORDER BY created_at DESC;

-- Check analysis results
SELECT id, score, created_at
FROM analysis_results
WHERE project_id = 'your-project-id'
ORDER BY created_at DESC;
```

## Log Retention

- **Browser console**: Cleared on page refresh
- **VS Code terminal**: Visible until you close terminal
- **Supabase logs**: Retained for 7 days (free tier)

## Quick Reference

### Most Important Logs to Watch

**For Single Page:**
```
🚀 Starting analysis
📊 Analysis data received
✅ Analysis saved
```

**For Crawl:**
```
✅ Crawl started successfully
🔍 Poll #X - Checking status
📈 Progress updated
✅ Crawl completed
```

**For Errors:**
```
❌ [FRONTEND] Any error message
```

### Log Locations Summary

| What | Where |
|------|-------|
| Frontend UI events | Browser Console (F12) |
| Frontend network | Browser Network Tab |
| Frontend dev server | VS Code Terminal (npm run dev) |
| Backend edge functions | `supabase functions logs` |
| Database queries | Supabase Dashboard or CLI |

---

**Remember**: Logs are your best friend for debugging. Always check them first!
