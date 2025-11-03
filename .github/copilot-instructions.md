# AI Agent Instructions for UXProbe Project

## Project Overview
UXProbe is a React-based web application for conducting UX research, analysis, and generating usability reports. The project uses Vite, TypeScript, React, shadcn-ui components, and Supabase for backend services.

## Core Architecture

### Frontend Structure
- `src/pages/`: React components for each route (e.g., Dashboard, Research, StudyPlan)
- `src/components/`: Reusable UI components using shadcn-ui
- `src/hooks/`: Custom React hooks for auth, toasts, and mobile detection
- `src/integrations/`: Integration clients (e.g., Supabase)
- `src/lib/`: Shared utilities, types, and validation schemas

### Backend Structure (Supabase Edge Functions)
- `supabase/functions/`: Serverless functions for:
  - Website crawling & analysis (`analyze-website/`, `crawl-website-basic/`)
  - Study plan generation (`generate-study-plan/`, `get-step-guidance/`)
  - Report generation (`generate-report/`)
  - AI-powered recommendations (`get-ai-recommendations/`)

## Key Patterns & Conventions

### Data Flow
1. UI components use TanStack Query for data fetching/caching
2. Supabase client (`@/integrations/supabase/client`) for database/auth operations
3. Edge functions handle complex operations with external AI services

### Component Structure
- Pages use `DashboardLayout` wrapper for consistent navigation
- Forms follow shadcn-ui patterns with `Card`, `Input`, and `Button` components
- Complex UI state managed with TanStack Query's mutations and queries

### UI Pattern Analysis
Located in `supabase/functions/analyze-website/ui-pattern-database.ts`:
```typescript
interface UIPattern {
  component: string;
  category: string;
  goodPatterns: Pattern[];
  badPatterns: Pattern[];
  heuristics: string[];
}
```

## Development Workflow

### Local Development
```bash
npm i        # Install dependencies
npm run dev  # Start dev server
```

### Project Structure Conventions
- New pages go in `src/pages/`
- Reusable components in `src/components/`
- Database types in `src/integrations/supabase/types.ts`
- Shared utilities in `src/lib/`

### Edge Function Development
- Edge functions use Deno runtime
- Test functions locally with Supabase CLI
- All functions must handle CORS and return proper headers

## Key Files & APIs

### Critical UI Components
- `DashboardLayout.tsx`: Main layout wrapper with navigation
- `ScreenshotViewer.tsx`: Core analysis visualization
- `CrawlProgressCard.tsx`: Website crawl status tracking
- `HeuristicsSelector.tsx`: UX heuristics selection interface

### Essential Hooks
- `useAuth.tsx`: Authentication state management
- `use-toast.ts`: Toast notification system
- `use-mobile.tsx`: Mobile device detection

## Common Tasks

### Adding a New Analysis Feature
1. Define patterns in `ui-pattern-database.ts`
2. Create Edge function for analysis
3. Add UI components for visualization
4. Update Results page to display findings

### Extending Study Plans
1. Add template to `STUDY_TEMPLATES` in `NewStudyPlan.tsx`
2. Update Edge functions for plan generation
3. Extend StudyPlanDetail page to handle new template

### Authentication Flow
- All protected routes use `useAuth` hook
- Redirect unauthenticated users to `/auth`
- Handle token refresh in Supabase client