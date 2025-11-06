# UX Probe - Figma Plugin

A Figma plugin that lets you browse and import your UX research data (User Journey Maps, Mind Maps, and Information Architecture) directly from your UX Probe account into Figma.

## Features

✅ **Direct Account Integration** - Sign in with your UX Probe credentials
✅ **Browse Your Research** - View all your saved research data in tabs
✅ **One-Click Import** - Import any research item directly into Figma
✅ **Beautiful Visualizations** - Professional layouts with proper formatting
✅ **Works in Figma & FigJam** - Compatible with both platforms

## Installation

### From Web App (Recommended):

1. **In UX Probe web app**, go to User Journey Mapping, Mind Mapping, or Information Architecture
2. Click **"Download Figma Plugin"** button
3. Extract the downloaded ZIP file
4. **In Figma**, go to Menu → Plugins → Development → Import plugin from manifest
5. **Select** the `manifest.json` file from the extracted folder
6. The plugin is now installed!

### For Development:

1. Clone/download the plugin files from the `figma-plugin` directory
2. Compile TypeScript: `npx tsc code.ts --target es6`
3. In Figma: Menu → Plugins → Development → Import plugin from manifest
4. Select the manifest.json file

## How to Use

### Sign In & Browse

1. Open Figma or FigJam
2. Run the plugin: Menu → Plugins → Development → UX Probe - Research Importer
3. **Sign in** with your UX Probe email and password
4. Browse your research data in three tabs:
   - **User Journeys** - All your user journey maps
   - **Mind Maps** - All your mind maps
   - **Info Architecture** - All your information architecture diagrams

### Import to Figma

1. Click on any research item you want to import
2. The plugin will automatically create a beautifully formatted visualization in Figma
3. Continue importing as many items as you need!

## Supported Research Types

- **User Journey Maps**: Full journey stages with actions, touchpoints, thoughts, pain points, opportunities, and emotions
- **Mind Maps**: Central topic with branching ideas and sub-branches
- **Information Architecture**: Hierarchical site/app structure with multiple levels

## Supported Export Types

- **User Journey Maps**: Full journey stages with actions, touchpoints, thoughts, pain points, opportunities, and emotions
- **Mind Maps**: Central topic with branching ideas and sub-branches
- **Information Architecture**: Hierarchical site/app structure with multiple levels

## Features

- ✅ One-click import after initial setup
- ✅ Maintains formatting and structure
- ✅ Automatic layout and spacing
- ✅ Professional visual design
- ✅ Works in both Figma and FigJam
- ✅ No API tokens required

## Building the Plugin

To compile the TypeScript code:

```bash
npx tsc code.ts --target es6
```

This will generate a `code.js` file that Figma will use.

## Troubleshooting

**Plugin doesn't appear:**
- Make sure you imported the manifest.json file
- Check that all three files (manifest.json, code.js, ui.html) are in the same folder

**Import fails:**
- Verify the JSON data is correctly formatted
- Make sure you copied the complete export data
- Check the browser console for any errors

## Support

For issues or questions, please contact support or check the documentation in the web app.
