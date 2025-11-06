import JSZip from 'jszip';

const PLUGIN_FILES = {
  'manifest.json': `{
  "name": "UX Research Importer",
  "id": "ux-research-importer",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "figjam"],
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}`,

  'code.js': `// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-data') {
    try {
      const data = JSON.parse(msg.data);
      
      if (data.exportType === 'user_journey_map') {
        await createUserJourneyMap(data.data);
      } else if (data.exportType === 'mind_map') {
        await createMindMap(data.data);
      } else if (data.exportType === 'information_architecture') {
        await createInformationArchitecture(data.data);
      }
      
      figma.notify('✓ Successfully imported into Figma!');
      figma.ui.postMessage({ type: 'import-success' });
    } catch (error) {
      figma.notify('✗ Import failed. Please check your data format.');
      figma.ui.postMessage({ type: 'import-error', error: error.message });
    }
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

async function createUserJourneyMap(data) {
  const frame = figma.createFrame();
  frame.name = data.title || 'User Journey Map';
  frame.resize(2400, 1200);
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  
  let xOffset = 100;
  const stageWidth = 400;
  const spacing = 50;
  
  const title = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  title.characters = data.title || 'User Journey Map';
  title.fontSize = 32;
  title.x = 100;
  title.y = 50;
  frame.appendChild(title);
  
  for (const stage of data.stages || []) {
    const stageFrame = figma.createFrame();
    stageFrame.name = stage.name;
    stageFrame.resize(stageWidth, 900);
    stageFrame.x = xOffset;
    stageFrame.y = 150;
    stageFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stageFrame.cornerRadius = 12;
    stageFrame.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 12, visible: true, blendMode: 'NORMAL' }];
    
    let yPos = 30;
    
    const stageName = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    stageName.characters = stage.name;
    stageName.fontSize = 20;
    stageName.x = 20;
    stageName.y = yPos;
    stageName.resize(stageWidth - 40, stageName.height);
    stageFrame.appendChild(stageName);
    yPos += 60;
    
    if (stage.actions?.length > 0) {
      yPos = await addSection(stageFrame, 'Actions', stage.actions, yPos, stageWidth);
    }
    
    if (stage.touchpoints?.length > 0) {
      yPos = await addSection(stageFrame, 'Touchpoints', stage.touchpoints, yPos, stageWidth);
    }
    
    if (stage.thoughts?.length > 0) {
      yPos = await addSection(stageFrame, 'Thoughts', stage.thoughts, yPos, stageWidth);
    }
    
    if (stage.painPoints?.length > 0) {
      yPos = await addSection(stageFrame, 'Pain Points', stage.painPoints, yPos, stageWidth);
    }
    
    if (stage.opportunities?.length > 0) {
      yPos = await addSection(stageFrame, 'Opportunities', stage.opportunities, yPos, stageWidth);
    }
    
    const emotionText = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    emotionText.characters = \`Emotion: \${getEmotionEmoji(stage.emotionLevel)}\`;
    emotionText.fontSize = 16;
    emotionText.x = 20;
    emotionText.y = yPos;
    stageFrame.appendChild(emotionText);
    
    frame.appendChild(stageFrame);
    xOffset += stageWidth + spacing;
  }
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createMindMap(data) {
  const frame = figma.createFrame();
  frame.name = data.title || 'Mind Map';
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  
  const centerX = 1500;
  const centerY = 1000;
  const centralNode = await createMindMapNode(data.centralTopic, centerX, centerY, 200, 100, true);
  frame.appendChild(centralNode);
  
  const branches = data.branches || [];
  const angleStep = (2 * Math.PI) / branches.length;
  const radius = 400;
  
  for (let i = 0; i < branches.length; i++) {
    const angle = i * angleStep;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    const branchNode = await createMindMapNode(branches[i].topic, x, y, 180, 80, false);
    frame.appendChild(branchNode);
    
    const line = figma.createLine();
    line.resize(Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)), 0);
    line.rotation = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    line.x = centerX;
    line.y = centerY;
    line.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    line.strokeWeight = 2;
    frame.appendChild(line);
    
    const subBranches = branches[i].subBranches || [];
    for (let j = 0; j < subBranches.length; j++) {
      const subAngle = angle + ((j - (subBranches.length - 1) / 2) * 0.5);
      const subRadius = 250;
      const subX = x + Math.cos(subAngle) * subRadius;
      const subY = y + Math.sin(subAngle) * subRadius;
      
      const subNode = await createMindMapNode(subBranches[j], subX, subY, 140, 60, false);
      frame.appendChild(subNode);
      
      const subLine = figma.createLine();
      subLine.resize(subRadius, 0);
      subLine.rotation = subAngle * (180 / Math.PI);
      subLine.x = x;
      subLine.y = y;
      subLine.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      subLine.strokeWeight = 1.5;
      frame.appendChild(subLine);
    }
  }
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createInformationArchitecture(data) {
  const frame = figma.createFrame();
  frame.name = data.name || 'Information Architecture';
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
  
  let yOffset = 100;
  
  const title = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  title.characters = data.name || 'Information Architecture';
  title.fontSize = 32;
  title.x = 100;
  title.y = 50;
  frame.appendChild(title);
  
  await createIALevel(frame, data.sections || [], 100, yOffset, 0);
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createIALevel(parent, items, x, y, level) {
  const indent = level * 250;
  const itemHeight = 80;
  const spacing = 30;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemY = y + i * (itemHeight + spacing);
    
    const box = figma.createFrame();
    box.name = item.name;
    box.resize(200, itemHeight);
    box.x = x + indent;
    box.y = itemY;
    box.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    box.cornerRadius = 8;
    box.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 8, visible: true, blendMode: 'NORMAL' }];
    
    const text = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    text.characters = item.name;
    text.fontSize = 16;
    text.x = 15;
    text.y = itemHeight / 2 - 10;
    text.resize(170, text.height);
    box.appendChild(text);
    
    parent.appendChild(box);
    
    if (item.children?.length > 0) {
      const childY = itemY + itemHeight + spacing;
      await createIALevel(parent, item.children, x, childY, level + 1);
      
      const line = figma.createLine();
      line.resize(250, 0);
      line.x = x + indent + 200;
      line.y = itemY + itemHeight / 2;
      line.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
      line.strokeWeight = 2;
      parent.appendChild(line);
    }
  }
}

async function createMindMapNode(text, x, y, width, height, isCentral) {
  const node = figma.createFrame();
  node.resize(width, height);
  node.x = x - width / 2;
  node.y = y - height / 2;
  node.cornerRadius = height / 2;
  node.fills = [{ type: 'SOLID', color: isCentral ? { r: 0.37, g: 0.49, b: 1 } : { r: 1, g: 1, b: 1 } }];
  node.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 4 }, radius: 12, visible: true, blendMode: 'NORMAL' }];
  
  const textNode = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: isCentral ? "Bold" : "Medium" });
  textNode.characters = text;
  textNode.fontSize = isCentral ? 18 : 14;
  textNode.textAlignHorizontal = 'CENTER';
  textNode.textAlignVertical = 'CENTER';
  textNode.resize(width - 20, height);
  textNode.x = 10;
  textNode.y = 0;
  textNode.fills = [{ type: 'SOLID', color: isCentral ? { r: 1, g: 1, b: 1 } : { r: 0.1, g: 0.1, b: 0.1 } }];
  node.appendChild(textNode);
  
  return node;
}

async function addSection(parent, title, items, yPos, width) {
  const sectionTitle = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "SemiBold" });
  sectionTitle.characters = title;
  sectionTitle.fontSize = 14;
  sectionTitle.x = 20;
  sectionTitle.y = yPos;
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  parent.appendChild(sectionTitle);
  yPos += 30;
  
  for (const item of items) {
    const bullet = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    bullet.characters = \`• \${item}\`;
    bullet.fontSize = 13;
    bullet.x = 20;
    bullet.y = yPos;
    bullet.resize(width - 40, bullet.height);
    parent.appendChild(bullet);
    yPos += bullet.height + 8;
  }
  
  return yPos + 20;
}

function getEmotionEmoji(level) {
  const emojis = ['😞', '😟', '😐', '🙂', '😊'];
  return emojis[Math.max(0, Math.min(4, level - 1))] || '😐';
}`,

  'ui.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 20px;
      background: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .input-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    textarea {
      width: 100%;
      min-height: 200px;
      padding: 12px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      resize: vertical;
      transition: border-color 0.2s;
    }
    textarea:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .button-group {
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .primary {
      background: #3b82f6;
      color: white;
    }
    .primary:hover {
      background: #2563eb;
    }
    .primary:disabled {
      background: #93c5fd;
      cursor: not-allowed;
    }
    .secondary {
      background: #f3f4f6;
      color: #374151;
    }
    .secondary:hover {
      background: #e5e7eb;
    }
    .status {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
    }
    .status.success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .status.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .instructions {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .instructions h3 {
      font-size: 14px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .instructions ol {
      font-size: 13px;
      color: #1e40af;
      line-height: 1.6;
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 UX Research Importer</h1>
    <p>Import your UX research data from the web app into Figma</p>
    
    <div class="instructions">
      <h3>How to use:</h3>
      <ol>
        <li>In the web app, click "Copy for Figma Plugin"</li>
        <li>Paste the data below</li>
        <li>Click "Import to Figma"</li>
      </ol>
    </div>
    
    <div class="input-group">
      <label for="data-input">Paste your export data here:</label>
      <textarea id="data-input" placeholder='{"exportType": "user_journey_map", "data": {...}}'></textarea>
    </div>
    
    <div class="button-group">
      <button class="secondary" id="cancel">Cancel</button>
      <button class="primary" id="import">Import to Figma</button>
    </div>
    
    <div class="status" id="status"></div>
  </div>

  <script>
    const dataInput = document.getElementById('data-input');
    const importBtn = document.getElementById('import');
    const cancelBtn = document.getElementById('cancel');
    const status = document.getElementById('status');

    importBtn.addEventListener('click', () => {
      const data = dataInput.value.trim();
      
      if (!data) {
        showStatus('Please paste your export data', 'error');
        return;
      }
      
      try {
        JSON.parse(data);
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        parent.postMessage({ pluginMessage: { type: 'import-data', data } }, '*');
      } catch (e) {
        showStatus('Invalid JSON format. Please check your data.', 'error');
      }
    });

    cancelBtn.addEventListener('click', () => {
      parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
    });

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'import-success') {
        showStatus('✓ Successfully imported into Figma!', 'success');
        importBtn.disabled = false;
        importBtn.textContent = 'Import to Figma';
        dataInput.value = '';
      } else if (msg.type === 'import-error') {
        showStatus(\`✗ Import failed: \${msg.error}\`, 'error');
        importBtn.disabled = false;
        importBtn.textContent = 'Import to Figma';
      }
    };

    function showStatus(message, type) {
      status.textContent = message;
      status.className = \`status \${type}\`;
      status.style.display = 'block';
      
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);
    }
  </script>
</body>
</html>`,

  'README.md': `# UX Research Figma Plugin

A Figma plugin to easily import UX research data (User Journey Maps, Mind Maps, and Information Architecture) from your web app directly into Figma.

## Installation

### Step 1: Download Plugin Files
You've already downloaded this ZIP file containing all necessary plugin files.

### Step 2: Install in Figma
1. **Open Figma Desktop App** (the plugin won't work in the browser version for development plugins)
2. Go to **Menu → Plugins → Development → "Import plugin from manifest..."**
3. **Navigate to this folder** and select the \`manifest.json\` file
4. Click **Open** - The plugin is now installed!

## How to Use

### Step 1: Export from Web App
1. Open your UX research tool (User Journey Mapping, Mind Mapping, or Information Architecture)
2. Click the **"Copy for Figma Plugin"** button (purple gradient button)
3. The data is automatically copied to your clipboard

### Step 2: Import to Figma
1. Open Figma or FigJam
2. Run the plugin: **Menu → Plugins → Development → UX Research Importer**
3. **Paste** the data (Ctrl+V or Cmd+V)
4. Click **"Import to Figma"**
5. Your research data is now beautifully visualized! 🎉

## Supported Export Types

✅ **User Journey Maps**: Full journey stages with actions, touchpoints, thoughts, pain points, opportunities, and emotions
✅ **Mind Maps**: Central topic with branching ideas and sub-branches  
✅ **Information Architecture**: Hierarchical site/app structure with multiple levels

## Features

- ✅ One-click import after initial setup
- ✅ Maintains formatting and structure
- ✅ Automatic layout and spacing
- ✅ Professional visual design
- ✅ Works in both Figma and FigJam
- ✅ No API tokens required

## Troubleshooting

**Plugin doesn't appear:**
- Make sure you're using the Figma **Desktop App** (not browser)
- Check that you imported the \`manifest.json\` file correctly
- Try restarting Figma

**Import fails:**
- Verify you copied the complete export data from the web app
- Check that you clicked "Copy for Figma Plugin" (not other export options)
- Make sure the data is pasted without any extra characters

**Visual issues:**
- The plugin uses Inter font - make sure it's available in your Figma file
- If layouts look off, try zooming out to see the full visualization

## Need Help?

Contact support or check the documentation in the web app for more assistance.

---

**Version:** 1.0.0  
**Compatible with:** Figma Desktop App, FigJam  
**License:** Free to use
`
};

export async function downloadFigmaPlugin() {
  const zip = new JSZip();
  
  // Add all plugin files to the ZIP
  Object.entries(PLUGIN_FILES).forEach(([filename, content]) => {
    zip.file(filename, content);
  });
  
  // Generate the ZIP file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ux-research-figma-plugin-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
