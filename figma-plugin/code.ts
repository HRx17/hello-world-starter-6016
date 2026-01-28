// Show the plugin UI
figma.showUI(__html__, { width: 420, height: 680 });

// Check for stored session on load
figma.clientStorage.getAsync('uxprobe_session').then((session) => {
  if (session) {
    figma.ui.postMessage({ type: 'restore-session', session });
  }
}).catch(() => {
  // No stored session, user will need to login
});

// ============= THEME DEFINITIONS =============
// Wireframe: Pure monochrome for early design validation
// Hi-Fi: Context-aware colors based on study/product type

const THEMES = {
  wireframe: {
    // Pure monochrome - black, white, grays only
    primary: { r: 0.1, g: 0.1, b: 0.1 },          // #1a1a1a (near black)
    secondary: { r: 0.95, g: 0.95, b: 0.95 },     // #f2f2f2 (light gray)
    accent: { r: 0.4, g: 0.4, b: 0.4 },           // #666666 (medium gray)
    background: { r: 1, g: 1, b: 1 },             // #ffffff (white)
    text: { r: 0.1, g: 0.1, b: 0.1 },             // #1a1a1a (near black)
    border: { r: 0.8, g: 0.8, b: 0.8 },           // #cccccc (light gray)
    muted: { r: 0.6, g: 0.6, b: 0.6 },            // #999999 (muted gray)
    // Semantic colors for wireframe (all grayscale)
    decision: { r: 0.5, g: 0.5, b: 0.5 },         // Gray for decisions
    action: { r: 0.2, g: 0.2, b: 0.2 },           // Dark gray for actions
    warning: { r: 0.3, g: 0.3, b: 0.3 },          // Gray for warnings
    success: { r: 0.4, g: 0.4, b: 0.4 },          // Gray for success
    hierarchy: [
      { r: 0.1, g: 0.1, b: 0.1 },   // Level 1 (darkest)
      { r: 0.3, g: 0.3, b: 0.3 },   // Level 2
      { r: 0.5, g: 0.5, b: 0.5 },   // Level 3
      { r: 0.7, g: 0.7, b: 0.7 },   // Level 4 (lightest)
    ]
  },
  hifi: {
    // High-fidelity - vibrant, semantic colors
    primary: { r: 0.23, g: 0.51, b: 0.84 },       // #3b82f6 (blue)
    secondary: { r: 0.96, g: 0.97, b: 0.99 },     // #f5f7fc (soft blue-gray)
    accent: { r: 0.56, g: 0.27, b: 0.89 },        // #8f44e3 (purple)
    background: { r: 1, g: 1, b: 1 },             // #ffffff
    text: { r: 0.07, g: 0.09, b: 0.15 },          // #121726 (dark blue-gray)
    border: { r: 0.89, g: 0.91, b: 0.94 },        // #e3e8f0
    muted: { r: 0.45, g: 0.51, b: 0.6 },          // #738299
    // Semantic colors for hi-fi
    decision: { r: 0.96, g: 0.62, b: 0.04 },      // #f59e0a (amber - decisions)
    action: { r: 0.23, g: 0.51, b: 0.84 },        // #3b82f6 (blue - CTAs)
    warning: { r: 0.94, g: 0.27, b: 0.27 },       // #ef4444 (red - warnings)
    success: { r: 0.13, g: 0.77, b: 0.45 },       // #22c473 (green - success)
    hierarchy: [
      { r: 0.23, g: 0.51, b: 0.84 },   // Level 1 (primary blue)
      { r: 0.38, g: 0.63, b: 0.92 },   // Level 2 (lighter blue)
      { r: 0.56, g: 0.75, b: 0.96 },   // Level 3
      { r: 0.79, g: 0.88, b: 0.98 },   // Level 4 (lightest)
    ]
  }
};

// Product-specific color palettes for hi-fi mode
const PRODUCT_PALETTES = {
  finance: {
    primary: { r: 0.0, g: 0.31, b: 0.53 },        // #004f87 (trust blue)
    accent: { r: 0.0, g: 0.47, b: 0.42 },         // #00786b (teal)
    success: { r: 0.13, g: 0.55, b: 0.33 },       // #228c54 (money green)
  },
  health: {
    primary: { r: 0.0, g: 0.55, b: 0.65 },        // #008ca6 (calm teal)
    accent: { r: 0.36, g: 0.72, b: 0.36 },        // #5cb85c (health green)
    success: { r: 0.24, g: 0.73, b: 0.6 },        // #3dba99
  },
  ecommerce: {
    primary: { r: 0.94, g: 0.27, b: 0.27 },       // #ef4444 (sale red)
    accent: { r: 1.0, g: 0.6, b: 0.0 },           // #ff9900 (amazon orange)
    success: { r: 0.13, g: 0.77, b: 0.45 },       // #22c473
  },
  social: {
    primary: { r: 0.23, g: 0.51, b: 0.84 },       // #3b82f6 (friendly blue)
    accent: { r: 0.91, g: 0.3, b: 0.62 },         // #e84d9e (engagement pink)
    success: { r: 0.13, g: 0.77, b: 0.45 },       // #22c473
  },
  productivity: {
    primary: { r: 0.09, g: 0.09, b: 0.09 },       // #171717 (professional)
    accent: { r: 0.23, g: 0.51, b: 0.84 },        // #3b82f6 (action blue)
    success: { r: 0.13, g: 0.77, b: 0.45 },       // #22c473
  }
};

type ThemeName = 'wireframe' | 'hifi';
type ProductCategory = keyof typeof PRODUCT_PALETTES;

interface AuditIssue {
  nodeId: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
}

// Load all required fonts upfront
async function loadRequiredFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" })
  ]);
}

// Get theme with optional product context for hi-fi
function getTheme(themeName: ThemeName, productCategory?: ProductCategory) {
  const baseTheme = THEMES[themeName];
  
  if (themeName === 'hifi' && productCategory && PRODUCT_PALETTES[productCategory]) {
    const palette = PRODUCT_PALETTES[productCategory];
    return {
      ...baseTheme,
      primary: palette.primary,
      accent: palette.accent,
      success: palette.success,
      action: palette.primary,
    };
  }
  
  return baseTheme;
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'store-session') {
    await figma.clientStorage.setAsync('uxprobe_session', msg.session);
  } else if (msg.type === 'clear-session') {
    await figma.clientStorage.deleteAsync('uxprobe_session');
  } else if (msg.type === 'import-persona') {
    try {
      await loadRequiredFonts();
      const themeName = msg.theme || 'wireframe';
      const productCategory = msg.productCategory;
      const theme = getTheme(themeName, productCategory);
      await createPersonaCard(msg.data, theme, themeName);
      figma.notify('✓ Persona imported!');
      figma.ui.postMessage({ type: 'import-success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      figma.notify('✗ Import failed: ' + errorMessage);
      figma.ui.postMessage({ type: 'import-error', error: errorMessage });
    }
  } else if (msg.type === 'import-data') {
    try {
      const data = JSON.parse(msg.data);
      const themeName = msg.theme || 'wireframe';
      const productCategory = msg.productCategory;
      const theme = getTheme(themeName, productCategory);
      await loadRequiredFonts();
      
      if (data.exportType === 'user_journey_map') {
        await createUserJourneyMap(data.data, theme, themeName);
      } else if (data.exportType === 'mind_map') {
        await createMindMap(data.data, theme, themeName);
      } else if (data.exportType === 'information_architecture') {
        await createInformationArchitecture(data.data, theme, themeName);
      }
      
      figma.notify('✓ Successfully imported into Figma!');
      figma.ui.postMessage({ type: 'import-success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      figma.notify('✗ Import failed: ' + errorMessage);
      figma.ui.postMessage({ type: 'import-error', error: errorMessage });
    }
  } else if (msg.type === 'check-selection') {
    // Return current selection info for audit validation
    const selection = figma.currentPage.selection;
    const hasSelection = selection.length > 0;
    const hasFrame = selection.some(n => n.type === 'FRAME');
    const hasPrototypeLinks = hasFrame && checkForPrototypeLinks(selection);
    
    figma.ui.postMessage({ 
      type: 'selection-info', 
      hasSelection,
      hasFrame,
      hasPrototypeLinks,
      selectedNodeName: hasSelection ? selection[0].name : null
    });
  } else if (msg.type === 'run-audit') {
    await runAudit(msg.mode, msg.persona, msg.productContext, msg.apiUrl, msg.accessToken);
  } else if (msg.type === 'navigate-to-node') {
    const node = figma.getNodeById(msg.nodeId);
    if (node && 'x' in node) {
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.currentPage.selection = [node as SceneNode];
    }
  } else if (msg.type === 'export-report') {
    generateReport(msg.format, msg.data);
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// Check if selected screens have prototype links (deep recursive scan)
function checkForPrototypeLinks(nodes: readonly SceneNode[]): boolean {
  for (const node of nodes) {
    if (hasPrototypeLinksRecursive(node)) {
      return true;
    }
  }
  return false;
}

// Recursively scan all nested elements for prototype links
function hasPrototypeLinksRecursive(node: SceneNode): boolean {
  // Check the node itself
  if ('reactions' in node && node.reactions && node.reactions.length > 0) {
    // Check if any reaction has a navigation action
    for (const reaction of node.reactions) {
      if (reaction.action && reaction.action.type === 'NODE' && reaction.action.destinationId) {
        return true;
      }
    }
  }
  
  // Recursively check all children at any depth
  if ('children' in node) {
    for (const child of (node as FrameNode).children) {
      if (hasPrototypeLinksRecursive(child)) {
        return true;
      }
    }
  }
  
  return false;
}

// ============= PERSONA CARD GENERATOR =============
async function createPersonaCard(persona: any, theme: any, themeName: ThemeName) {
  const isWireframe = themeName === 'wireframe';
  
  const frame = figma.createFrame();
  frame.name = `Persona - ${persona.name}${isWireframe ? ' (Wireframe)' : ''}`;
  frame.resize(360, 480);
  frame.cornerRadius = isWireframe ? 0 : 16;
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  frame.strokes = [{ type: 'SOLID', color: theme.border }];
  frame.strokeWeight = isWireframe ? 2 : 1;
  
  if (!isWireframe) {
    frame.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.08 },
      offset: { x: 0, y: 8 },
      radius: 24,
      visible: true,
      blendMode: 'NORMAL'
    }];
  }
  
  let yPos = 24;
  
  // Avatar placeholder
  const avatar = figma.createEllipse();
  avatar.resize(80, 80);
  avatar.x = 140;
  avatar.y = yPos;
  avatar.fills = [{ type: 'SOLID', color: theme.primary }];
  if (isWireframe) {
    avatar.strokes = [{ type: 'SOLID', color: theme.text }];
    avatar.strokeWeight = 2;
  }
  frame.appendChild(avatar);
  
  const avatarText = figma.createText();
  avatarText.fontName = { family: "Inter", style: "Bold" };
  avatarText.characters = (persona.name && persona.name.charAt(0)) ? persona.name.charAt(0).toUpperCase() : 'P';
  avatarText.fontSize = 32;
  avatarText.fills = [{ type: 'SOLID', color: isWireframe ? theme.background : { r: 1, g: 1, b: 1 } }];
  avatarText.x = 168;
  avatarText.y = yPos + 22;
  frame.appendChild(avatarText);
  yPos += 100;
  
  // Name
  const nameText = figma.createText();
  nameText.fontName = { family: "Inter", style: "Bold" };
  nameText.characters = persona.name || 'Unnamed Persona';
  nameText.fontSize = 20;
  nameText.fills = [{ type: 'SOLID', color: theme.text }];
  nameText.textAlignHorizontal = 'CENTER';
  nameText.resize(320, nameText.height);
  nameText.x = 20;
  nameText.y = yPos;
  frame.appendChild(nameText);
  yPos += 32;
  
  // Description
  if (persona.description) {
    const descText = figma.createText();
    descText.fontName = { family: "Inter", style: "Regular" };
    descText.characters = persona.description;
    descText.fontSize = 13;
    descText.fills = [{ type: 'SOLID', color: theme.muted || { r: 0.4, g: 0.4, b: 0.4 } }];
    descText.textAlignHorizontal = 'CENTER';
    descText.resize(320, descText.height);
    descText.x = 20;
    descText.y = yPos;
    frame.appendChild(descText);
    yPos += descText.height + 20;
  }
  
  // Divider
  const divider = figma.createRectangle();
  divider.resize(320, isWireframe ? 2 : 1);
  divider.x = 20;
  divider.y = yPos;
  divider.fills = [{ type: 'SOLID', color: theme.border }];
  frame.appendChild(divider);
  yPos += 20;
  
  // Goals
  if (persona.goals && persona.goals.length > 0) {
    yPos = await addPersonaSection(frame, '🎯 Goals', persona.goals, yPos, theme, isWireframe);
  }
  
  // Pain Points
  if (persona.pain_points && persona.pain_points.length > 0) {
    yPos = await addPersonaSection(frame, '😟 Pain Points', persona.pain_points, yPos, theme, isWireframe);
  }
  
  // Resize frame to fit content
  frame.resize(360, Math.max(480, yPos + 24));
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function addPersonaSection(parent: FrameNode, title: string, items: string[], yPos: number, theme: any, isWireframe: boolean): Promise<number> {
  const titleText = figma.createText();
  titleText.fontName = { family: "Inter", style: "Semi Bold" };
  titleText.characters = title;
  titleText.fontSize = 12;
  titleText.fills = [{ type: 'SOLID', color: isWireframe ? theme.text : theme.primary }];
  titleText.x = 24;
  titleText.y = yPos;
  parent.appendChild(titleText);
  yPos += 22;
  
  for (const item of items.slice(0, 3)) {
    const itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.characters = "• " + item;
    itemText.fontSize = 12;
    itemText.fills = [{ type: 'SOLID', color: theme.text }];
    itemText.resize(312, itemText.height);
    itemText.x = 24;
    itemText.y = yPos;
    parent.appendChild(itemText);
    yPos += itemText.height + 6;
  }
  
  return yPos + 12;
}

// ============= USER JOURNEY MAP GENERATOR =============
async function createUserJourneyMap(data: any, theme: any, themeName: ThemeName) {
  const isWireframe = themeName === 'wireframe';
  
  const frame = figma.createFrame();
  frame.name = (data.title || 'User Journey Map') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(2400, 1200);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  let xOffset = 80;
  const stageWidth = 380;
  const spacing = 40;
  
  // Title
  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.characters = data.title || 'User Journey Map';
  title.fontSize = 28;
  title.fills = [{ type: 'SOLID', color: theme.text }];
  title.x = 80;
  title.y = 40;
  frame.appendChild(title);
  
  // Stages
  const stages = data.stages || [];
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageFrame = figma.createFrame();
    stageFrame.name = stage.name;
    stageFrame.resize(stageWidth, 900);
    stageFrame.x = xOffset;
    stageFrame.y = 120;
    stageFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stageFrame.cornerRadius = isWireframe ? 0 : 12;
    stageFrame.strokes = [{ type: 'SOLID', color: theme.border }];
    stageFrame.strokeWeight = isWireframe ? 2 : 1;
    
    if (!isWireframe) {
      stageFrame.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.06 },
        offset: { x: 0, y: 4 },
        radius: 12,
        visible: true,
        blendMode: 'NORMAL'
      }];
    }
    
    let yPos = 24;
    
    // Stage header - use hierarchy colors for hi-fi
    const headerColor = isWireframe 
      ? theme.primary 
      : (theme.hierarchy && theme.hierarchy[i % theme.hierarchy.length]) || theme.primary;
    
    const headerBg = figma.createRectangle();
    headerBg.resize(stageWidth, 48);
    headerBg.x = 0;
    headerBg.y = 0;
    headerBg.fills = [{ type: 'SOLID', color: headerColor }];
    headerBg.cornerRadius = isWireframe ? 0 : 12;
    stageFrame.appendChild(headerBg);
    
    // Fix corner radius for header (only top corners)
    const headerMask = figma.createRectangle();
    headerMask.resize(stageWidth, 24);
    headerMask.x = 0;
    headerMask.y = 24;
    headerMask.fills = [{ type: 'SOLID', color: headerColor }];
    stageFrame.appendChild(headerMask);
    
    const stageName = figma.createText();
    stageName.fontName = { family: "Inter", style: "Semi Bold" };
    stageName.characters = stage.name;
    stageName.fontSize = 16;
    stageName.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stageName.x = 20;
    stageName.y = 14;
    stageName.resize(stageWidth - 40, stageName.height);
    stageFrame.appendChild(stageName);
    yPos = 68;
    
    // Sections
    if (stage.actions && stage.actions.length > 0) {
      yPos = await addJourneySection(stageFrame, '📋 Actions', stage.actions, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.touchpoints && stage.touchpoints.length > 0) {
      yPos = await addJourneySection(stageFrame, '📱 Touchpoints', stage.touchpoints, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.thoughts && stage.thoughts.length > 0) {
      yPos = await addJourneySection(stageFrame, '💭 Thoughts', stage.thoughts, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.painPoints && stage.painPoints.length > 0) {
      yPos = await addJourneySection(stageFrame, '😟 Pain Points', stage.painPoints, yPos, stageWidth, theme, isWireframe, theme.warning);
    }
    if (stage.opportunities && stage.opportunities.length > 0) {
      yPos = await addJourneySection(stageFrame, '💡 Opportunities', stage.opportunities, yPos, stageWidth, theme, isWireframe, theme.success);
    }
    
    // Emotion indicator
    const emotionText = figma.createText();
    emotionText.fontName = { family: "Inter", style: "Medium" };
    emotionText.characters = "Emotion: " + getEmotionEmoji(stage.emotionLevel);
    emotionText.fontSize = 14;
    emotionText.x = 20;
    emotionText.y = yPos;
    emotionText.fills = [{ type: 'SOLID', color: theme.text }];
    stageFrame.appendChild(emotionText);
    
    frame.appendChild(stageFrame);
    xOffset += stageWidth + spacing;
  }
  
  // Resize frame to fit content
  frame.resize(Math.max(2400, xOffset + 80), 1200);
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function addJourneySection(parent: FrameNode, title: string, items: string[], yPos: number, width: number, theme: any, isWireframe: boolean, accentColor?: any): Promise<number> {
  const sectionTitle = figma.createText();
  sectionTitle.fontName = { family: "Inter", style: "Semi Bold" };
  sectionTitle.characters = title;
  sectionTitle.fontSize = 12;
  sectionTitle.x = 20;
  sectionTitle.y = yPos;
  sectionTitle.fills = [{ type: 'SOLID', color: accentColor || (isWireframe ? theme.accent : { r: 0.4, g: 0.4, b: 0.4 }) }];
  parent.appendChild(sectionTitle);
  yPos += 24;
  
  for (const item of items) {
    const bullet = figma.createText();
    bullet.fontName = { family: "Inter", style: "Regular" };
    bullet.characters = "• " + item;
    bullet.fontSize = 12;
    bullet.x = 20;
    bullet.y = yPos;
    bullet.fills = [{ type: 'SOLID', color: theme.text }];
    bullet.resize(width - 40, bullet.height);
    parent.appendChild(bullet);
    yPos += bullet.height + 6;
  }
  
  return yPos + 16;
}

// ============= MIND MAP GENERATOR =============
async function createMindMap(data: any, theme: any, themeName: ThemeName) {
  const isWireframe = themeName === 'wireframe';
  
  const frame = figma.createFrame();
  frame.name = (data.title || 'Mind Map') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  const centerX = 1500;
  const centerY = 1000;
  
  // Central node
  const centralNode = await createMindMapNode(data.centralTopic, centerX, centerY, 220, 110, true, theme, isWireframe, 0);
  frame.appendChild(centralNode);
  
  // Branch nodes
  const branches = data.branches || [];
  const angleStep = (2 * Math.PI) / Math.max(branches.length, 1);
  const radius = 420;
  
  for (let i = 0; i < branches.length; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Create connector line
    const line = figma.createLine();
    const lineLength = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) - 120;
    line.resize(lineLength, 0);
    line.rotation = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    line.x = centerX + Math.cos(angle) * 110;
    line.y = centerY + Math.sin(angle) * 55;
    line.strokes = [{ type: 'SOLID', color: theme.border }];
    line.strokeWeight = isWireframe ? 2 : 2;
    frame.appendChild(line);
    
    const branchNode = await createMindMapNode(branches[i].topic, x, y, 180, 80, false, theme, isWireframe, 1);
    frame.appendChild(branchNode);
    
    // Sub-branches
    const subBranches = branches[i].subBranches || [];
    for (let j = 0; j < subBranches.length; j++) {
      const subAngle = angle + ((j - (subBranches.length - 1) / 2) * 0.4);
      const subRadius = 240;
      const subX = x + Math.cos(subAngle) * subRadius;
      const subY = y + Math.sin(subAngle) * subRadius;
      
      const subLine = figma.createLine();
      subLine.resize(subRadius - 50, 0);
      subLine.rotation = subAngle * (180 / Math.PI);
      subLine.x = x + Math.cos(subAngle) * 90;
      subLine.y = y + Math.sin(subAngle) * 40;
      subLine.strokes = [{ type: 'SOLID', color: theme.border }];
      subLine.strokeWeight = 1.5;
      frame.appendChild(subLine);
      
      const subNode = await createMindMapNode(subBranches[j], subX, subY, 140, 60, false, theme, isWireframe, 2);
      frame.appendChild(subNode);
    }
  }
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createMindMapNode(text: string, x: number, y: number, width: number, height: number, isCentral: boolean, theme: any, isWireframe: boolean, level: number): Promise<FrameNode> {
  const node = figma.createFrame();
  node.resize(width, height);
  node.x = x - width / 2;
  node.y = y - height / 2;
  node.cornerRadius = isWireframe ? 0 : height / 2;
  
  // Use hierarchy colors for hi-fi mode
  let fillColor;
  if (isCentral) {
    fillColor = theme.primary;
  } else if (isWireframe) {
    fillColor = { r: 1, g: 1, b: 1 };
  } else {
    fillColor = (theme.hierarchy && theme.hierarchy[Math.min(level, theme.hierarchy.length - 1)]) || { r: 1, g: 1, b: 1 };
  }
  
  node.fills = [{ type: 'SOLID', color: isCentral ? theme.primary : (isWireframe ? { r: 1, g: 1, b: 1 } : fillColor) }];
  node.strokes = [{ type: 'SOLID', color: isCentral ? theme.primary : theme.border }];
  node.strokeWeight = isWireframe ? 2 : 1.5;
  
  if (!isWireframe) {
    node.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 4 },
      radius: 12,
      visible: true,
      blendMode: 'NORMAL'
    }];
  }
  
  const textNode = figma.createText();
  textNode.fontName = { family: "Inter", style: isCentral ? "Semi Bold" : "Medium" };
  textNode.characters = text;
  textNode.fontSize = isCentral ? 18 : 13;
  textNode.textAlignHorizontal = 'CENTER';
  textNode.textAlignVertical = 'CENTER';
  textNode.resize(width - 24, height);
  textNode.x = 12;
  textNode.y = 0;
  
  // Determine text color based on background
  const needsWhiteText = isCentral || (!isWireframe && level < 2);
  textNode.fills = [{ type: 'SOLID', color: needsWhiteText ? { r: 1, g: 1, b: 1 } : theme.text }];
  node.appendChild(textNode);
  
  return node;
}

// ============= INFORMATION ARCHITECTURE GENERATOR =============
async function createInformationArchitecture(data: any, theme: any, themeName: ThemeName) {
  const isWireframe = themeName === 'wireframe';
  
  const frame = figma.createFrame();
  frame.name = (data.name || 'Information Architecture') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  // Title
  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.characters = data.name || 'Information Architecture';
  title.fontSize = 28;
  title.fills = [{ type: 'SOLID', color: theme.text }];
  title.x = 80;
  title.y = 40;
  frame.appendChild(title);
  
  // Create hierarchy
  await createIALevel(frame, data.sections || [], 80, 120, 0, theme, isWireframe);
  
  figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createIALevel(parent: FrameNode, items: any[], x: number, y: number, level: number, theme: any, isWireframe: boolean): Promise<number> {
  const indent = level * 280;
  const itemHeight = 56;
  const spacing = 24;
  
  let currentY = y;
  
  for (const item of items) {
    // Use hierarchy colors for different levels in hi-fi mode
    const levelColor = isWireframe 
      ? theme.primary 
      : (theme.hierarchy && theme.hierarchy[Math.min(level, theme.hierarchy.length - 1)]) || theme.primary;
    
    const node = figma.createFrame();
    node.name = item.name;
    node.resize(240, itemHeight);
    node.x = x + indent;
    node.y = currentY;
    node.cornerRadius = isWireframe ? 0 : 8;
    node.fills = [{ type: 'SOLID', color: level === 0 ? levelColor : theme.secondary }];
    node.strokes = [{ type: 'SOLID', color: level === 0 ? levelColor : theme.border }];
    node.strokeWeight = isWireframe ? 2 : 1;
    
    if (!isWireframe) {
      node.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.06 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: 'NORMAL'
      }];
    }
    
    const textNode = figma.createText();
    textNode.fontName = { family: "Inter", style: level === 0 ? "Semi Bold" : "Medium" };
    textNode.characters = item.name;
    textNode.fontSize = level === 0 ? 14 : 12;
    textNode.x = 16;
    textNode.y = (itemHeight - 20) / 2;
    textNode.fills = [{ type: 'SOLID', color: level === 0 && !isWireframe ? { r: 1, g: 1, b: 1 } : theme.text }];
    node.appendChild(textNode);
    
    parent.appendChild(node);
    currentY += itemHeight + spacing;
    
    // Recursively create children
    if (item.children && item.children.length > 0) {
      // Draw connector line
      const line = figma.createLine();
      line.resize(20, 0);
      line.x = x + indent + 240;
      line.y = currentY - spacing / 2 - itemHeight / 2;
      line.strokes = [{ type: 'SOLID', color: theme.border }];
      line.strokeWeight = isWireframe ? 2 : 1.5;
      parent.appendChild(line);
      
      currentY = await createIALevel(parent, item.children, x, currentY, level + 1, theme, isWireframe);
    }
  }
  
  return currentY;
}

// ============= AUDIT SYSTEM =============

// Get all frames connected via prototype links starting from a frame
// Traverse all prototype connections starting from a screen
// This deeply scans ALL nested elements (frames, groups, components, instances, etc.)
async function traversePrototypeFlow(startScreen: FrameNode): Promise<FrameNode[]> {
  const visited = new Set<string>();
  const screens: FrameNode[] = [];
  const queue: FrameNode[] = [startScreen];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) continue;
    
    visited.add(current.id);
    screens.push(current);
    
    // Find all prototype links in this screen (including deeply nested elements)
    const linkedScreens = findAllPrototypeDestinations(current);
    for (const linkedScreen of linkedScreens) {
      if (!visited.has(linkedScreen.id)) {
        queue.push(linkedScreen);
      }
    }
  }
  
  return screens;
}

// Recursively find ALL prototype destinations from any element at any nesting level
function findAllPrototypeDestinations(node: SceneNode): FrameNode[] {
  const destinations: FrameNode[] = [];
  const destinationIds = new Set<string>(); // Avoid duplicates
  
  // Recursive helper to scan all elements
  function scanNode(n: SceneNode) {
    // Check if this node has prototype reactions
    if ('reactions' in n && n.reactions) {
      for (const reaction of n.reactions) {
        if (reaction.action && reaction.action.type === 'NODE' && reaction.action.destinationId) {
          const destId = reaction.action.destinationId;
          if (!destinationIds.has(destId)) {
            const dest = figma.getNodeById(destId);
            if (dest && dest.type === 'FRAME') {
              destinations.push(dest as FrameNode);
              destinationIds.add(destId);
            }
          }
        }
      }
    }
    
    // Recursively scan all children (any type that can have children)
    if ('children' in n) {
      const container = n as FrameNode | GroupNode | ComponentNode | InstanceNode;
      for (const child of container.children) {
        scanNode(child);
      }
    }
  }
  
  scanNode(node);
  return destinations;
}

async function runAudit(mode: string, persona: any, productContext: string, apiUrl: string, accessToken: string) {
  const selection = figma.currentPage.selection;
  
  // Validate selection
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'audit-error', error: 'Please select a screen first' });
    return;
  }
  
  const startScreen = selection.find(n => n.type === 'FRAME') as FrameNode;
  if (!startScreen) {
    figma.ui.postMessage({ type: 'audit-error', error: 'Please select a screen (Frame) - not a group or other element' });
    return;
  }
  
  figma.ui.postMessage({ type: 'audit-progress', progress: 5 });
  
  let screensToAudit: FrameNode[] = [];
  
  if (mode === 'current') {
    screensToAudit = [startScreen];
  } else if (mode === 'flow') {
    // Traverse all prototype links (including nested elements)
    figma.ui.postMessage({ type: 'audit-status', message: 'Discovering prototype flow from all nested elements...' });
    screensToAudit = await traversePrototypeFlow(startScreen);
    
    if (screensToAudit.length === 1) {
      figma.ui.postMessage({ type: 'audit-warning', warning: 'No prototype links found. Auditing single screen.' });
    } else {
      figma.ui.postMessage({ type: 'audit-status', message: 'Found ' + screensToAudit.length + ' connected screens' });
    }
  }
  
  figma.ui.postMessage({ type: 'audit-progress', progress: 15 });
  
  const issues: AuditIssue[] = [];
  const screenImages: Array<{ nodeId: string; name: string; imageData: string }> = [];
  
  // Run lint checks on all screens
  for (const screen of screensToAudit) {
    await runLintChecks(screen, issues);
  }
  
  figma.ui.postMessage({ type: 'audit-progress', progress: 30 });
  
  // Export all screens as images
  if (persona) {
    figma.ui.postMessage({ type: 'audit-status', message: 'Capturing screenshots...' });
    
    for (let i = 0; i < screensToAudit.length; i++) {
      const screen = screensToAudit[i];
      try {
        const imageData = await screen.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
        const base64 = figma.base64Encode(imageData);
        screenImages.push({
          nodeId: screen.id,
          name: screen.name,
          imageData: 'data:image/png;base64,' + base64
        });
      } catch (e) {
        console.error('Failed to export screen:', screen.name, e);
      }
      
      const progress = 30 + ((i + 1) / screensToAudit.length) * 20;
      figma.ui.postMessage({ type: 'audit-progress', progress });
    }
    
    figma.ui.postMessage({ type: 'audit-progress', progress: 50 });
    figma.ui.postMessage({ type: 'audit-status', message: 'Running AI analysis...' });
    
    // Send to AI for analysis
    try {
      const response = await fetch(apiUrl + '/functions/v1/figma-audit-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZXlqc3FhbHpjZGVqd3N2b3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDYwMDIsImV4cCI6MjA3NjE4MjAwMn0.jThP8cy8deaDkQZlTz6Bb0C1DU6praULawIej2vBghA'
        },
        body: JSON.stringify({
          frames: screenImages,
          persona: {
            name: persona.name,
            description: persona.description,
            painPoints: persona.pain_points,
            goals: persona.goals
          },
          productContext: productContext,
          auditMode: mode
        })
      });
      
      figma.ui.postMessage({ type: 'audit-progress', progress: 80 });
      
      if (response.ok) {
        const aiResult = await response.json();
        if (aiResult.issues) {
          for (const aiIssue of aiResult.issues) {
            issues.push({
              nodeId: aiIssue.frameId || startScreen.id,
              title: aiIssue.title,
              description: aiIssue.description,
              severity: aiIssue.severity || 'medium',
              category: aiIssue.category || 'ai-heuristic'
            });
          }
        }
        
        // Include persona journey narrative if available
        if (aiResult.journeyNarrative) {
          figma.ui.postMessage({ type: 'journey-narrative', narrative: aiResult.journeyNarrative });
        }
      }
    } catch (error) {
      console.error('AI audit error:', error);
      // Fallback to single-screen AI analysis
      if (screenImages.length > 0) {
        try {
          const fallbackResponse = await fetch(apiUrl + '/functions/v1/figma-audit-ai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + accessToken,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZXlqc3FhbHpjZGVqd3N2b3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDYwMDIsImV4cCI6MjA3NjE4MjAwMn0.jThP8cy8deaDkQZlTz6Bb0C1DU6praULawIej2vBghA'
            },
            body: JSON.stringify({
              imageData: screenImages[0].imageData,
              persona: {
                name: persona.name,
                description: persona.description,
                painPoints: persona.pain_points,
                goals: persona.goals
              }
            })
          });
          
          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.issues) {
              for (const aiIssue of fallbackResult.issues) {
                issues.push({
                  nodeId: startScreen.id,
                  title: aiIssue.title,
                  description: aiIssue.description,
                  severity: aiIssue.severity || 'medium',
                  category: 'ai-heuristic'
                });
              }
            }
          }
        } catch (fallbackError) {
          console.error('Fallback AI audit error:', fallbackError);
        }
      }
    }
  }
  
  figma.ui.postMessage({ type: 'audit-progress', progress: 100 });
  figma.ui.postMessage({ type: 'audit-complete', issues, screenCount: screensToAudit.length });
}

async function runLintChecks(node: SceneNode, issues: AuditIssue[]) {
  // Check the node
  if (node.name.match(/^(Frame|Group|Rectangle|Ellipse|Text)\s*\d*$/i)) {
    issues.push({
      nodeId: node.id,
      title: 'Poor Layer Naming',
      description: 'Layer "' + node.name + '" has a generic name. Use descriptive names for better organization.',
      severity: 'low',
      category: 'naming'
    });
  }
  
  // Check touch targets
  if ('width' in node && 'height' in node) {
    if ((node.width < 44 || node.height < 44) && node.name.toLowerCase().match(/button|btn|link|tap|click|cta/)) {
      issues.push({
        nodeId: node.id,
        title: 'Small Touch Target',
        description: '"' + node.name + '" is ' + Math.round(node.width) + 'x' + Math.round(node.height) + 'px. Minimum recommended size is 44x44px for accessibility.',
        severity: 'high',
        category: 'accessibility'
      });
    }
  }
  
  // Check children recursively
  if ('children' in node) {
    for (const child of (node as FrameNode).children) {
      await runLintChecks(child, issues);
    }
  }
}

// ============= REPORT GENERATOR =============
function generateReport(format: string, data: any) {
  const { auditResults, persona } = data;
  
  let content = '';
  
  if (format === 'markdown') {
    content = generateMarkdownReport(auditResults, persona);
  } else {
    content = generateHtmlReport(auditResults, persona);
  }
  
  figma.ui.postMessage({ type: 'export-ready', format, content });
}

function generateMarkdownReport(issues: AuditIssue[], persona: any): string {
  let md = '# Pre-Usability Audit Report\n\n';
  md += '**Generated:** ' + new Date().toLocaleString() + '\n\n';
  
  if (persona) {
    md += '## Persona Context\n\n';
    md += '| Attribute | Value |\n';
    md += '|-----------|-------|\n';
    md += '| Name | ' + persona.name + ' |\n';
    md += '| Description | ' + (persona.description || 'N/A') + ' |\n';
    if (persona.goals && persona.goals.length) {
      md += '| Goals | ' + persona.goals.join(', ') + ' |\n';
    }
    if (persona.pain_points && persona.pain_points.length) {
      md += '| Pain Points | ' + persona.pain_points.join(', ') + ' |\n';
    }
    md += '\n';
  }
  
  md += '## Executive Summary\n\n';
  md += '- **Total Issues:** ' + issues.length + '\n';
  md += '- **High Severity:** ' + issues.filter(function(i) { return i.severity === 'high'; }).length + '\n';
  md += '- **Medium Severity:** ' + issues.filter(function(i) { return i.severity === 'medium'; }).length + '\n';
  md += '- **Low Severity:** ' + issues.filter(function(i) { return i.severity === 'low'; }).length + '\n\n';
  
  md += '## Detailed Findings\n\n';
  
  issues.forEach(function(issue, i) {
    md += '### ' + (i + 1) + '. ' + issue.title + '\n\n';
    md += '**Severity:** ' + issue.severity.toUpperCase() + '\n\n';
    md += '**Category:** ' + issue.category + '\n\n';
    md += issue.description + '\n\n';
    md += '---\n\n';
  });
  
  return md;
}

function generateHtmlReport(issues: AuditIssue[], persona: any): string {
  var highCount = issues.filter(function(i) { return i.severity === 'high'; }).length;
  var mediumCount = issues.filter(function(i) { return i.severity === 'medium'; }).length;
  var lowCount = issues.filter(function(i) { return i.severity === 'low'; }).length;
  
  var issuesHtml = issues.map(function(issue, i) {
    return '<div class="issue ' + issue.severity + '">' +
      '<span class="badge ' + issue.severity + '">' + issue.severity.toUpperCase() + '</span>' +
      '<span class="badge" style="background:#f3f4f6;color:#374151;">' + issue.category + '</span>' +
      '<h3>' + (i + 1) + '. ' + issue.title + '</h3>' +
      '<p>' + issue.description + '</p>' +
    '</div>';
  }).join('');
  
  return '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <title>Pre-Usability Audit Report</title>' +
'  <style>' +
'    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937; }' +
'    h1 { color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }' +
'    h2 { color: #374151; margin-top: 32px; }' +
'    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }' +
'    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; }' +
'    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }' +
'    .stat { background: white; padding: 16px; border-radius: 8px; }' +
'    .stat .value { font-size: 28px; font-weight: 700; }' +
'    .stat .label { font-size: 12px; color: #6b7280; }' +
'    .high .value { color: #dc2626; }' +
'    .medium .value { color: #d97706; }' +
'    .low .value { color: #2563eb; }' +
'    .issue { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #e5e7eb; }' +
'    .issue.high { border-left-color: #dc2626; }' +
'    .issue.medium { border-left-color: #d97706; }' +
'    .issue.low { border-left-color: #2563eb; }' +
'    .issue h3 { margin: 0 0 8px; }' +
'    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-right: 8px; }' +
'    .badge.high { background: #fef2f2; color: #dc2626; }' +
'    .badge.medium { background: #fffbeb; color: #d97706; }' +
'    .badge.low { background: #eff6ff; color: #2563eb; }' +
'    @media print { body { padding: 20px; } }' +
'  </style>' +
'</head>' +
'<body>' +
'  <h1>🔍 Pre-Usability Audit Report</h1>' +
'  <p class="meta">Generated: ' + new Date().toLocaleString() + '</p>' +
(persona ? '<h2>Persona Context</h2><p><strong>' + persona.name + '</strong></p><p>' + (persona.description || '') + '</p>' : '') +
'  <div class="summary">' +
'    <div class="summary-grid">' +
'      <div class="stat"><div class="value">' + issues.length + '</div><div class="label">Total</div></div>' +
'      <div class="stat high"><div class="value">' + highCount + '</div><div class="label">High</div></div>' +
'      <div class="stat medium"><div class="value">' + mediumCount + '</div><div class="label">Medium</div></div>' +
'      <div class="stat low"><div class="value">' + lowCount + '</div><div class="label">Low</div></div>' +
'    </div>' +
'  </div>' +
'  <h2>Detailed Findings</h2>' +
issuesHtml +
'</body>' +
'</html>';
}

function getEmotionEmoji(level: number): string {
  var emojis = ['😞', '😟', '😐', '🙂', '😊'];
  var idx = Math.max(0, Math.min(4, level - 1));
  return emojis[idx] || '😐';
}
