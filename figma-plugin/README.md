# UX Probe - Figma Plugin

## 🚀 Production Status: READY ✅

A comprehensive Figma plugin that connects UX research data from your UX Probe account directly to Figma, enabling research-driven design validation.

### Production Checklist
- ✅ TypeScript compiled to JavaScript (code.js)
- ✅ Edge functions deployed (figma-audit-ai, figma-bridge)
- ✅ Network domains whitelisted in manifest
- ✅ Session persistence via clientStorage
- ✅ Error handling for API calls and rate limits
- ✅ All 3 themes tested and working
- ✅ Report export (Markdown + HTML)

## Features

### 📥 Bridge Module (Research Importer)
- **Personas**: Import user personas with goals, pain points, and demographics
- **User Journey Maps**: Import journey stages with actions, touchpoints, and emotions
- **Mind Maps**: Import hierarchical mind maps with branches and sub-branches
- **Site Maps (IA)**: Import information architecture structures

### 🎨 Theme System
Choose from three visual themes for your imports:
- **Blueprint** - Clean wireframe style with blue accents
- **Corporate** - Professional high-fidelity with dark accents  
- **Minimal** - Simple, understated design

### 🔍 Pre-Usability Audit Engine
Run automated usability audits on your designs:

**Layer 1: Lint Checks (Rule-Based)**
- Poor layer naming detection
- Missing interactions on buttons
- Small touch targets (<44px)

**Layer 2: AI Visual Heuristics**
- Accessibility issues (contrast, touch targets)
- Usability problems (unclear CTAs, navigation)
- Persona-specific friction points

**Layer 3: Contextual Validation**
- Tests designs against selected persona context
- Identifies barriers to user goals
- Flags elements that conflict with known pain points

### 📋 Report Generation
- Export findings as Markdown (.md)
- Export as printable HTML/PDF
- Includes persona context and severity ratings

## Installation

### From Web App (Recommended):

1. In **UX Probe web app**, go to any research tool page
2. Click **"Download Figma Plugin"** button
3. Extract the downloaded ZIP file
4. In **Figma**: Menu → Plugins → Development → Import plugin from manifest
5. Select the `manifest.json` file from the extracted folder

### For Development:

1. Clone the plugin files from the `figma-plugin` directory
2. Compile TypeScript: `npx tsc code.ts --target es6 --lib es6,dom`
3. In Figma: Menu → Plugins → Development → Import plugin from manifest
4. Select the manifest.json file

## How to Use

### Authentication
1. Open Figma and run the plugin
2. Sign in with your UX Probe email and password
3. Your session is saved for future use

### Importing Research Data
1. Select a **Theme** from the dropdown
2. Browse tabs: **Personas**, **Journeys**, **Mind Maps**, **Site Maps**
3. Click any item to import it to the canvas

### Running Audits
1. Go to the **Audit** tab
2. Select a **Persona** for context (optional but recommended)
3. Choose **Scope**: Current Selection, Entire Page, or Linked Flow
4. Click **Lint** for quick rule checks or **Full Audit** for AI analysis

### Viewing Results
- Issues appear with High/Medium/Low severity badges
- Click **"Go to"** to jump to the problematic layer
- Click **"Ignore"** to dismiss false positives

### Exporting Reports
1. Go to the **Report** tab
2. Click **Markdown** or **PDF** to download

## Technical Requirements

- Figma Desktop App or Browser (latest version)
- UX Probe account with saved research data
- Internet connection for API access

## Supported Data Types

| Type | Import | Audit Context |
|------|--------|---------------|
| Personas | ✅ | ✅ |
| User Journey Maps | ✅ | ❌ |
| Mind Maps | ✅ | ❌ |
| Information Architecture | ✅ | ❌ |

## Troubleshooting

**Plugin doesn't appear:**
- Ensure you imported the manifest.json file correctly
- Check all files (manifest.json, code.js, ui.html) are in the same folder

**Login fails:**
- Verify your UX Probe account credentials
- Check your internet connection

**Audit returns no results:**
- Make sure frames are selected
- For AI audits, select a persona for context

**Import looks wrong:**
- Try a different theme
- Ensure your research data has proper structure

## API Endpoints Used

- `POST /auth/v1/token` - Authentication
- `GET /functions/v1/figma-bridge/personas` - Fetch personas
- `GET /functions/v1/get-figma-user-journey-maps` - Fetch journeys
- `GET /functions/v1/get-figma-mind-maps` - Fetch mind maps
- `GET /functions/v1/get-figma-information-architectures` - Fetch IA
- `POST /functions/v1/figma-audit-ai` - AI-powered design audit

## Building

```bash
# Compile TypeScript
npx tsc code.ts --target es6 --lib es6,dom

# Or with watch mode for development
npx tsc code.ts --target es6 --lib es6,dom --watch
```

## Support

For issues or questions, contact support@uxprobe.com or check the documentation in the web app.
