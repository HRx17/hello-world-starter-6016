# UX Research Figma Plugin

A Figma plugin to easily import UX research data (User Journey Maps, Mind Maps, and Information Architecture) from your web app directly into Figma.

## Installation

### For Users:

1. **Download the plugin files** (code.ts, manifest.json, ui.html)
2. **In Figma**, go to Menu → Plugins → Development → Import plugin from manifest
3. **Select** the manifest.json file
4. The plugin is now installed and ready to use!

### For Development:

1. Install the Figma desktop app
2. Clone/download the plugin files
3. Compile TypeScript: `npx tsc code.ts --target es6`
4. In Figma: Menu → Plugins → Development → Import plugin from manifest
5. Select the manifest.json file

## How to Use

### Step 1: Export from Web App
1. Open your UX research tool (User Journey Mapping, Mind Mapping, or Information Architecture)
2. Click the **"Export to Figma"** button
3. Copy the generated JSON data

### Step 2: Import to Figma
1. Open Figma/FigJam
2. Run the plugin: Menu → Plugins → Development → UX Research Importer
3. Paste the copied JSON data
4. Click **"Import to Figma"**
5. Your research data is now beautifully visualized in Figma!

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
