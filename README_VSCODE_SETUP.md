# Running the UX Heuristic Analysis Tool in VS Code

This guide will help you run the project locally in VS Code and see all backend and frontend logs in your terminal.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **VS Code** - [Download here](https://code.visualstudio.com/)
3. **Supabase CLI** - [Installation guide](https://supabase.com/docs/guides/cli)
4. **API Keys**:
   - Firecrawl API Key (for web scraping) - [Get it here](https://firecrawl.dev/)
   - Google AI API Key (for Gemini) - [Get it here](https://makersuite.google.com/app/apikey)

## Setup Steps

### 1. Clone/Open Project in VS Code

```bash
# Open the project folder in VS Code
code .
```

### 2. Install Dependencies

Open the integrated terminal in VS Code (`Ctrl + ~` or `Cmd + ~`) and run:

```bash
npm install
```

### 3. Set Up Environment Variables

The `.env` file should already exist with Supabase variables. You need to add your API keys:

```bash
# Open .env file and add these lines:
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

### 4. Set Up Supabase Locally (Optional but Recommended)

If you want to test with a local Supabase instance:

```bash
# Start local Supabase (includes Postgres, Auth, Storage, Edge Functions)
supabase start

# This will output the local URLs and keys - update your .env file accordingly
```

### 5. Configure Edge Functions Secrets

For edge functions to access API keys:

```bash
# Navigate to each edge function directory and create .env files
# Or use Supabase CLI to set secrets:
supabase secrets set FIRECRAWL_API_KEY=your_key_here
supabase secrets set GOOGLE_AI_API_KEY=your_key_here
```

## Running the Application

### Option 1: Run Frontend + Backend Together (Recommended)

In VS Code terminal:

```bash
# Terminal 1: Start Vite dev server (Frontend)
npm run dev

# Terminal 2: Start Supabase locally (Backend + Edge Functions)
supabase start
```

### Option 2: Run with Production Supabase

If using the production Supabase instance (from Lovable Cloud):

```bash
# Just start the frontend
npm run dev
```

## Viewing Logs

### Frontend Logs

All frontend logs will appear in **VS Code's terminal** where you ran `npm run dev`, and in the **Browser DevTools Console**.

Look for these log patterns:
- `🚀 [FRONTEND] Starting...` - Analysis/crawl initiation
- `📊 [FRONTEND]` - Configuration and data
- `✅ [FRONTEND]` - Success messages
- `❌ [FRONTEND]` - Error messages
- `📡 [FRONTEND]` - Backend API calls
- `📥 [FRONTEND]` - Backend responses

### Backend Edge Function Logs

#### With Local Supabase:

```bash
# View all edge function logs in real-time
supabase functions logs

# View specific function logs
supabase functions logs analyze-website
supabase functions logs start-website-crawl
supabase functions logs check-crawl-status
```

#### With Production Supabase (Lovable Cloud):

View logs in the Lovable Cloud dashboard or use Supabase CLI connected to remote:

```bash
# Connect to remote project
supabase link --project-ref vaeyjsqalzcdejwsvoql

# View remote logs
supabase functions logs --project-ref vaeyjsqalzcdejwsvoql
```

### Browser DevTools

Open Chrome/Firefox DevTools (`F12`):
- **Console tab**: See all frontend logs
- **Network tab**: See API requests/responses to edge functions
- **Application tab**: See local storage, session data

## Example: Full Analysis Flow Logs

When you analyze a website, you'll see logs like this:

### Frontend (VS Code Terminal + Browser Console):

```
🎯 [FRONTEND] Form submitted - Starting analysis flow
📋 [FRONTEND] Analysis type: single
🌐 [FRONTEND] URL: https://stripe.com
✅ [FRONTEND] URL validation passed
➡️ [FRONTEND] Executing single-page analysis
🚀 [FRONTEND] Starting single-page analysis for: https://stripe.com
📊 [FRONTEND] Using heuristics: {set: "nn_10", custom: []}
📡 [FRONTEND] Invoking analyze-website edge function...
📥 [FRONTEND] Received response from backend: {...}
✅ [FRONTEND] Analysis data received: {score: 88, violations: 3, strengths: 7, screenshot: true}
💾 [FRONTEND] Saving results to database for user: 4c45d086-...
📝 [FRONTEND] Inserting analysis result for project: c90ef049-...
✅ [FRONTEND] Analysis saved to database
🔄 [FRONTEND] Navigating to results page
✅ [FRONTEND] Analysis/Crawl initiated successfully
```

### Backend Edge Function (Supabase Logs):

```
============================================================
PROFESSIONAL-GRADE MULTI-STAGE HEURISTIC EVALUATION
============================================================
URL: https://stripe.com
Heuristics config: {set: "nn_10", custom: []}

[STEP 0] Scraping website with Firecrawl...
✓ Scraping complete

[STAGE 1] Deep Visual Decomposition...
✓ Stage 1 complete

[STAGE 2] Structural Analysis...
✓ Stage 2 complete

[STAGE 3] Per-Heuristic Evaluation (10 focused analyses)...
  Evaluating 10 heuristics...
✓ Stage 3 complete: 15 violations, 8 strengths

[STAGE 4] Cross-Validation & Deduplication...
✓ Stage 4 complete: 3 validated violations
  Removed: 10 duplicates, 2 false positives

[STAGE 5] Research-Backed Scoring...
✓ Stage 5 complete: Final score 88/100

============================================================
ANALYSIS COMPLETE
============================================================
Total violations: 3
Total strengths: 8
Final score: 88/100
Industry percentile: Top 25% - Above Average UX
============================================================
```

## Debugging Tips

### 1. Check API Keys
```bash
# Verify keys are set
echo $FIRECRAWL_API_KEY
echo $GOOGLE_AI_API_KEY
```

### 2. Test Edge Functions Locally
```bash
# Test a function directly
curl -i --location 'http://localhost:54321/functions/v1/analyze-website' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"url":"https://example.com"}'
```

### 3. Check Supabase Status
```bash
supabase status
```

### 4. View Database
```bash
# Open Supabase Studio (local dashboard)
# URL will be shown after running 'supabase start'
# Usually: http://localhost:54323
```

### 5. Reset Local Database
```bash
supabase db reset
```

## Troubleshooting

### Issue: "Function not found"
- Make sure Supabase is running: `supabase status`
- Deploy functions: `supabase functions deploy`

### Issue: "API key not configured"
- Check `.env` file has correct keys
- For edge functions, set secrets: `supabase secrets set KEY=value`

### Issue: No logs appearing
- Check browser console (F12)
- Check VS Code terminal where `npm run dev` is running
- For backend: `supabase functions logs --tail`

### Issue: CORS errors
- Local Supabase should handle CORS automatically
- For production, CORS headers are configured in edge functions

## Project Structure

```
├── src/
│   ├── pages/
│   │   └── Index.tsx           # Main analysis page (frontend logs here)
│   ├── components/
│   └── integrations/
│       └── supabase/
│           └── client.ts       # Supabase client
├── supabase/
│   ├── functions/
│   │   ├── analyze-website/    # Main analysis function
│   │   ├── start-website-crawl/
│   │   └── check-crawl-status/
│   └── config.toml
├── .env                        # Environment variables
└── README_VSCODE_SETUP.md      # This file
```

## Additional Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/cli/local-development)
- [Vite Dev Server Docs](https://vitejs.dev/guide/)
- [Firecrawl API Docs](https://docs.firecrawl.dev/)
- [Google AI API Docs](https://ai.google.dev/docs)

## Need Help?

Check the console logs carefully - they're designed to show you exactly what's happening at each step. The emoji prefixes make it easy to scan:
- 🚀 = Starting something
- ✅ = Success
- ❌ = Error
- 📊 = Configuration/data
- 📡 = API call
- 📥 = Response received
- 💾 = Database operation
