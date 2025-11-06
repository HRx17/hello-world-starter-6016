import JSZip from 'jszip';

export function generateFigmaPluginFiles() {
  const manifestContent = `{
  "name": "UX Probe - Research Importer",
  "id": "ux-research-importer",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "figjam"],
  "networkAccess": {
    "allowedDomains": ["https://vaeyjsqalzcdejwsvoql.supabase.co"],
    "reasoning": "Required to fetch user's research data from authenticated backend"
  }
}`;

  const codeContent = `// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Load all required fonts upfront
async function loadRequiredFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "SemiBold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" })
  ]);
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-data') {
    try {
      // Load all fonts first
      await loadRequiredFonts();
      
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
      figma.notify('✗ Import failed: ' + error.message);
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
  title.characters = data.title || 'User Journey Map';
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
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
    stageName.characters = stage.name;
    stageName.fontSize = 20;
    stageName.fontName = { family: "Inter", style: "SemiBold" };
    stageName.x = 20;
    stageName.y = yPos;
    stageName.resize(stageWidth - 40, stageName.height);
    stageFrame.appendChild(stageName);
    yPos += 60;
    
    if (stage.actions && stage.actions.length > 0) {
      yPos = await addSection(stageFrame, 'Actions', stage.actions, yPos, stageWidth);
    }
    
    if (stage.touchpoints && stage.touchpoints.length > 0) {
      yPos = await addSection(stageFrame, 'Touchpoints', stage.touchpoints, yPos, stageWidth);
    }
    
    if (stage.thoughts && stage.thoughts.length > 0) {
      yPos = await addSection(stageFrame, 'Thoughts', stage.thoughts, yPos, stageWidth);
    }
    
    if (stage.painPoints && stage.painPoints.length > 0) {
      yPos = await addSection(stageFrame, 'Pain Points', stage.painPoints, yPos, stageWidth);
    }
    
    if (stage.opportunities && stage.opportunities.length > 0) {
      yPos = await addSection(stageFrame, 'Opportunities', stage.opportunities, yPos, stageWidth);
    }
    
    const emotionText = figma.createText();
    emotionText.characters = \`Emotion: \${getEmotionEmoji(stage.emotionLevel)}\`;
    emotionText.fontSize = 16;
    emotionText.fontName = { family: "Inter", style: "Regular" };
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
  title.characters = data.name || 'Information Architecture';
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
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
    text.characters = item.name;
    text.fontSize = 16;
    text.fontName = { family: "Inter", style: "Medium" };
    text.x = 15;
    text.y = itemHeight / 2 - 10;
    text.resize(170, text.height);
    box.appendChild(text);
    
    parent.appendChild(box);
    
    if (item.children && item.children.length > 0) {
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
  textNode.characters = text;
  textNode.fontSize = isCentral ? 18 : 14;
  textNode.fontName = { family: "Inter", style: isCentral ? "SemiBold" : "Medium" };
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
  sectionTitle.characters = title;
  sectionTitle.fontSize = 14;
  sectionTitle.fontName = { family: "Inter", style: "SemiBold" };
  sectionTitle.x = 20;
  sectionTitle.y = yPos;
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  parent.appendChild(sectionTitle);
  yPos += 30;
  
  for (const item of items) {
    const bullet = figma.createText();
    bullet.characters = \`• \${item}\`;
    bullet.fontSize = 13;
    bullet.fontName = { family: "Inter", style: "Regular" };
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
}`;

  const uiContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 0;
      background: #f9fafb;
      height: 100vh;
      overflow: hidden;
    }
    
    .auth-screen {
      padding: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .auth-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .auth-header p {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
    }
    .input-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    button {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn-primary:disabled {
      background: #93c5fd;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      margin-top: 8px;
    }
    .btn-secondary:hover {
      background: #e5e7eb;
    }
    
    .main-screen {
      display: none;
      height: 100vh;
      flex-direction: column;
    }
    .header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h2 {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    .user-info {
      font-size: 12px;
      color: #6b7280;
    }
    .logout-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 12px;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
      width: auto;
    }
    .logout-btn:hover {
      background: #fef2f2;
    }
    
    .tabs {
      display: flex;
      background: white;
      border-bottom: 1px solid #e5e7eb;
    }
    .tab {
      flex: 1;
      padding: 12px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #6b7280;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      width: auto;
    }
    .tab.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
    }
    .tab:hover {
      color: #374151;
    }
    
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .tab-panel {
      display: none;
    }
    .tab-panel.active {
      display: block;
    }
    
    .item-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-card {
      background: white;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .item-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
    }
    .item-card h3 {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    .item-card p {
      font-size: 12px;
      color: #6b7280;
    }
    
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #9ca3af;
    }
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .loading {
      text-align: center;
      padding: 48px 24px;
      color: #6b7280;
    }
    
    .status {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      margin: 16px;
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
    
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="auth-screen" id="authScreen">
    <div class="auth-header">
      <h1>🎨 UX Probe</h1>
      <p>Sign in to import your research data into Figma</p>
    </div>
    
    <div class="input-group">
      <label for="email">Email</label>
      <input type="email" id="email" placeholder="your@email.com" />
    </div>
    
    <div class="input-group">
      <label for="password">Password</label>
      <input type="password" id="password" placeholder="••••••••" />
    </div>
    
    <button class="btn-primary" id="loginBtn">Sign In</button>
    <button class="btn-secondary" id="cancelBtn">Cancel</button>
  </div>

  <div class="main-screen" id="mainScreen">
    <div class="header">
      <h2>Your Research Data</h2>
      <div>
        <span class="user-info" id="userEmail"></span>
        <button class="logout-btn" id="logoutBtn">Logout</button>
      </div>
    </div>
    
    <div class="tabs">
      <button class="tab active" data-tab="journeys">User Journeys</button>
      <button class="tab" data-tab="mindmaps">Mind Maps</button>
      <button class="tab" data-tab="ia">Info Architecture</button>
    </div>
    
    <div class="content">
      <div class="tab-panel active" id="journeysPanel">
        <div class="loading">Loading...</div>
      </div>
      <div class="tab-panel" id="mindmapsPanel">
        <div class="loading">Loading...</div>
      </div>
      <div class="tab-panel" id="iaPanel">
        <div class="loading">Loading...</div>
      </div>
    </div>
  </div>

  <div class="status" id="status"></div>

  <script>
    const API_URL = 'https://vaeyjsqalzcdejwsvoql.supabase.co';
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZXlqc3FhbHpjZGVqd3N2b3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDYwMDIsImV4cCI6MjA3NjE4MjAwMn0.jThP8cy8deaDkQZlTz6Bb0C1DU6praULawIej2vBghA';
    
    let accessToken = null;
    let userEmail = null;

    const authScreen = document.getElementById('authScreen');
    const mainScreen = document.getElementById('mainScreen');
    const loginBtn = document.getElementById('loginBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const userEmailSpan = document.getElementById('userEmail');
    const tabs = document.querySelectorAll('.tab');
    const status = document.getElementById('status');

    loginBtn.addEventListener('click', handleLogin);
    cancelBtn.addEventListener('click', () => parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*'));
    logoutBtn.addEventListener('click', handleLogout);
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });

    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') passwordInput.focus();
    });
    
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });

    async function handleLogin() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showStatus('Please enter email and password', 'error');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';

      try {
        const response = await fetch(\`\${API_URL}/auth/v1/token?grant_type=password\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error_description || 'Login failed');
        }

        accessToken = data.access_token;
        userEmail = email;
        
        showMainScreen();
        await loadAllData();
      } catch (error) {
        showStatus('Login failed: ' + error.message, 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    }

    function handleLogout() {
      accessToken = null;
      userEmail = null;
      emailInput.value = '';
      passwordInput.value = '';
      authScreen.classList.remove('hidden');
      mainScreen.style.display = 'none';
    }

    function showMainScreen() {
      authScreen.classList.add('hidden');
      mainScreen.style.display = 'flex';
      userEmailSpan.textContent = userEmail;
    }

    function switchTab(tabName) {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
      
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(\`\${tabName}Panel\`).classList.add('active');
    }

    async function loadAllData() {
      await Promise.all([
        loadJourneys(),
        loadMindMaps(),
        loadIA()
      ]);
    }

    async function loadJourneys() {
      const panel = document.getElementById('journeysPanel');
      try {
        const response = await fetch(\`\${API_URL}/functions/v1/get-figma-user-journey-maps\`, {
          headers: {
            'Authorization': \`Bearer \${accessToken}\`,
            'apikey': ANON_KEY
          }
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Failed to load');

        renderItems(panel, result.data, 'user_journey_map');
      } catch (error) {
        panel.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error: \${error.message}</p></div>\`;
      }
    }

    async function loadMindMaps() {
      const panel = document.getElementById('mindmapsPanel');
      try {
        const response = await fetch(\`\${API_URL}/functions/v1/get-figma-mind-maps\`, {
          headers: {
            'Authorization': \`Bearer \${accessToken}\`,
            'apikey': ANON_KEY
          }
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Failed to load');

        renderItems(panel, result.data, 'mind_map');
      } catch (error) {
        panel.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error: \${error.message}</p></div>\`;
      }
    }

    async function loadIA() {
      const panel = document.getElementById('iaPanel');
      try {
        const response = await fetch(\`\${API_URL}/functions/v1/get-figma-information-architectures\`, {
          headers: {
            'Authorization': \`Bearer \${accessToken}\`,
            'apikey': ANON_KEY
          }
        });

        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Failed to load');

        renderItems(panel, result.data, 'information_architecture');
      } catch (error) {
        panel.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error: \${error.message}</p></div>\`;
      }
    }

    function renderItems(panel, items, type) {
      if (!items || items.length === 0) {
        panel.innerHTML = \`<div class="empty-state"><div class="empty-state-icon">📭</div><p>No \${type.replace('_', ' ')}s found</p></div>\`;
        return;
      }

      const itemList = document.createElement('div');
      itemList.className = 'item-list';

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = \`
          <h3>\${escapeHtml(item.title)}</h3>
          <p>\${new Date(item.created_at).toLocaleDateString()}</p>
        \`;
        
        card.addEventListener('click', () => {
          importItem(item, type);
        });
        
        itemList.appendChild(card);
      });

      panel.innerHTML = '';
      panel.appendChild(itemList);
    }

    function importItem(item, type) {
      try {
        let exportData = null;

        if (type === 'user_journey_map') {
          if (!item.journey_data) {
            throw new Error('Invalid journey map data');
          }
          exportData = {
            exportType: 'user_journey_map',
            data: item.journey_data
          };
        } else if (type === 'mind_map') {
          if (!item.content) {
            throw new Error('Invalid mind map data');
          }
          exportData = {
            exportType: 'mind_map',
            data: transformMindMapData(item.content)
          };
        } else if (type === 'information_architecture') {
          if (!item.structure) {
            throw new Error('Invalid architecture data');
          }
          exportData = {
            exportType: 'information_architecture',
            data: transformIAData(item.structure)
          };
        }

        if (!exportData) {
          throw new Error('Unknown data type');
        }

        parent.postMessage({ 
          pluginMessage: { 
            type: 'import-data', 
            data: JSON.stringify(exportData)
          } 
        }, '*');
      } catch (error) {
        showStatus('Failed to import: ' + error.message, 'error');
      }
    }

    function transformMindMapData(content) {
      if (!content || !content.nodes || !Array.isArray(content.nodes)) {
        return { title: 'Mind Map', centralTopic: 'Main Topic', branches: [] };
      }
      
      const branches = [];
      const rootNode = content.nodes.find(n => n.id === 'root');
      if (!rootNode) return { title: content.title || 'Mind Map', centralTopic: 'Main Topic', branches: [] };
      
      const rootChildren = content.nodes.filter(n => n.parentId === 'root');

      rootChildren.forEach(child => {
        const subBranches = content.nodes
          .filter(n => n.parentId === child.id)
          .map(n => n.label || n.name || 'Untitled');

        branches.push({
          topic: child.label || child.name || 'Branch',
          subBranches: subBranches
        });
      });

      return {
        title: content.title || rootNode.label || 'Mind Map',
        centralTopic: rootNode.label || rootNode.name || 'Main Topic',
        branches: branches
      };
    }

    function transformIAData(structure) {
      if (!structure || !structure.nodes || !Array.isArray(structure.nodes)) {
        return { name: 'Information Architecture', sections: [] };
      }
      
      function buildHierarchy(nodes, parentId = null) {
        return nodes
          .filter(n => n.parentId === parentId)
          .map(node => ({
            name: node.label || node.name || 'Untitled',
            children: buildHierarchy(nodes, node.id)
          }));
      }

      return {
        name: structure.title || 'Information Architecture',
        sections: buildHierarchy(structure.nodes, null)
      };
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showStatus(message, type) {
      status.textContent = message;
      status.className = \`status \${type}\`;
      status.style.display = 'block';
      
      setTimeout(() => {
        status.style.display = 'none';
      }, 5000);
    }

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'import-success') {
        showStatus('✓ Successfully imported into Figma!', 'success');
      } else if (msg.type === 'import-error') {
        showStatus(\`✗ Import failed: \${msg.error}\`, 'error');
      }
    };
  </script>
</body>
</html>`;

  return {
    'manifest.json': manifestContent,
    'code.js': codeContent,
    'ui.html': uiContent
  };
}

export async function downloadFigmaPlugin() {
  const zip = new JSZip();
  const files = generateFigmaPluginFiles();
  
  zip.file('manifest.json', files['manifest.json']);
  zip.file('code.js', files['code.js']);
  zip.file('ui.html', files['ui.html']);
  
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ux-probe-figma-plugin.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}