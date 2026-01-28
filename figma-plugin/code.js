figma.showUI(__html__, { width: 420, height: 680 });
figma.clientStorage.getAsync('uxprobe_session').then(function(s) { if (s) figma.ui.postMessage({ type: 'restore-session', session: s }); }).catch(function() {});

var THEMES = {
  wireframe: {
    primary: { r: 0.1, g: 0.1, b: 0.1 },
    secondary: { r: 0.95, g: 0.95, b: 0.95 },
    accent: { r: 0.4, g: 0.4, b: 0.4 },
    background: { r: 1, g: 1, b: 1 },
    text: { r: 0.1, g: 0.1, b: 0.1 },
    border: { r: 0.8, g: 0.8, b: 0.8 },
    muted: { r: 0.6, g: 0.6, b: 0.6 },
    decision: { r: 0.5, g: 0.5, b: 0.5 },
    action: { r: 0.2, g: 0.2, b: 0.2 },
    warning: { r: 0.3, g: 0.3, b: 0.3 },
    success: { r: 0.4, g: 0.4, b: 0.4 },
    hierarchy: [
      { r: 0.1, g: 0.1, b: 0.1 },
      { r: 0.3, g: 0.3, b: 0.3 },
      { r: 0.5, g: 0.5, b: 0.5 },
      { r: 0.7, g: 0.7, b: 0.7 }
    ]
  },
  hifi: {
    primary: { r: 0.23, g: 0.51, b: 0.84 },
    secondary: { r: 0.96, g: 0.97, b: 0.99 },
    accent: { r: 0.56, g: 0.27, b: 0.89 },
    background: { r: 1, g: 1, b: 1 },
    text: { r: 0.07, g: 0.09, b: 0.15 },
    border: { r: 0.89, g: 0.91, b: 0.94 },
    muted: { r: 0.45, g: 0.51, b: 0.6 },
    decision: { r: 0.96, g: 0.62, b: 0.04 },
    action: { r: 0.23, g: 0.51, b: 0.84 },
    warning: { r: 0.94, g: 0.27, b: 0.27 },
    success: { r: 0.13, g: 0.77, b: 0.45 },
    hierarchy: [
      { r: 0.23, g: 0.51, b: 0.84 },
      { r: 0.38, g: 0.63, b: 0.92 },
      { r: 0.56, g: 0.75, b: 0.96 },
      { r: 0.79, g: 0.88, b: 0.98 }
    ]
  }
};

function loadFonts() {
  return Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" })
  ]);
}

function getTheme(themeName, productCategory) {
  return THEMES[themeName] || THEMES.wireframe;
}

function getEmotionEmoji(level) {
  var emojis = ['😞', '😟', '😐', '🙂', '😊'];
  var idx = Math.max(0, Math.min(4, (level || 3) - 1));
  return emojis[idx] || '😐';
}

// Check if selected screens have prototype links (deep recursive scan)
function checkForPrototypeLinks(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (hasPrototypeLinksRecursive(nodes[i])) {
      return true;
    }
  }
  return false;
}

function hasPrototypeLinksRecursive(node) {
  if (node.reactions && node.reactions.length > 0) {
    for (var i = 0; i < node.reactions.length; i++) {
      var reaction = node.reactions[i];
      if (reaction.action && reaction.action.type === 'NODE' && reaction.action.destinationId) {
        return true;
      }
    }
  }
  if (node.children) {
    for (var j = 0; j < node.children.length; j++) {
      if (hasPrototypeLinksRecursive(node.children[j])) {
        return true;
      }
    }
  }
  return false;
}

function traverse(start) {
  var visited = {};
  var screens = [];
  var queue = [start];
  while (queue.length) {
    var current = queue.shift();
    if (!current || visited[current.id]) continue;
    visited[current.id] = true;
    screens.push(current);
    var linkedScreens = findAllPrototypeDestinations(current);
    for (var i = 0; i < linkedScreens.length; i++) {
      if (!visited[linkedScreens[i].id]) {
        queue.push(linkedScreens[i]);
      }
    }
  }
  return screens;
}

function findAllPrototypeDestinations(node) {
  var destinations = [];
  var destinationIds = {};
  function scanNode(n) {
    if (n.reactions) {
      for (var i = 0; i < n.reactions.length; i++) {
        var reaction = n.reactions[i];
        if (reaction.action && reaction.action.type === 'NODE' && reaction.action.destinationId) {
          var destId = reaction.action.destinationId;
          if (!destinationIds[destId]) {
            var dest = figma.getNodeById(destId);
            if (dest && dest.type === 'FRAME') {
              destinations.push(dest);
              destinationIds[destId] = true;
            }
          }
        }
      }
    }
    if (n.children) {
      for (var j = 0; j < n.children.length; j++) {
        scanNode(n.children[j]);
      }
    }
  }
  scanNode(node);
  return destinations;
}

// ============= PERSONA CARD GENERATOR =============
function createPersonaCard(persona, theme, themeName) {
  var isWireframe = themeName === 'wireframe';
  var frame = figma.createFrame();
  frame.name = 'Persona - ' + (persona.name || 'Unknown') + (isWireframe ? ' (Wireframe)' : '');
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
  
  var yPos = 24;
  
  // Avatar
  var avatar = figma.createEllipse();
  avatar.resize(80, 80);
  avatar.x = 140;
  avatar.y = yPos;
  avatar.fills = [{ type: 'SOLID', color: theme.primary }];
  if (isWireframe) {
    avatar.strokes = [{ type: 'SOLID', color: theme.text }];
    avatar.strokeWeight = 2;
  }
  frame.appendChild(avatar);
  
  var avatarText = figma.createText();
  avatarText.fontName = { family: "Inter", style: "Bold" };
  avatarText.characters = (persona.name && persona.name.charAt(0)) ? persona.name.charAt(0).toUpperCase() : 'P';
  avatarText.fontSize = 32;
  avatarText.fills = [{ type: 'SOLID', color: isWireframe ? theme.background : { r: 1, g: 1, b: 1 } }];
  avatarText.x = 168;
  avatarText.y = yPos + 22;
  frame.appendChild(avatarText);
  yPos += 100;
  
  // Name
  var nameText = figma.createText();
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
    var descText = figma.createText();
    descText.fontName = { family: "Inter", style: "Regular" };
    descText.characters = persona.description;
    descText.fontSize = 13;
    descText.fills = [{ type: 'SOLID', color: theme.muted }];
    descText.textAlignHorizontal = 'CENTER';
    descText.resize(320, descText.height);
    descText.x = 20;
    descText.y = yPos;
    frame.appendChild(descText);
    yPos += descText.height + 20;
  }
  
  // Divider
  var divider = figma.createRectangle();
  divider.resize(320, isWireframe ? 2 : 1);
  divider.x = 20;
  divider.y = yPos;
  divider.fills = [{ type: 'SOLID', color: theme.border }];
  frame.appendChild(divider);
  yPos += 20;
  
  // Goals
  if (persona.goals && persona.goals.length > 0) {
    yPos = addPersonaSection(frame, '🎯 Goals', persona.goals, yPos, theme, isWireframe);
  }
  
  // Pain Points
  if (persona.pain_points && persona.pain_points.length > 0) {
    yPos = addPersonaSection(frame, '😟 Pain Points', persona.pain_points, yPos, theme, isWireframe);
  }
  
  frame.resize(360, Math.max(480, yPos + 24));
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
}

function addPersonaSection(parent, title, items, yPos, theme, isWireframe) {
  var titleText = figma.createText();
  titleText.fontName = { family: "Inter", style: "Semi Bold" };
  titleText.characters = title;
  titleText.fontSize = 12;
  titleText.fills = [{ type: 'SOLID', color: isWireframe ? theme.text : theme.primary }];
  titleText.x = 24;
  titleText.y = yPos;
  parent.appendChild(titleText);
  yPos += 22;
  
  var maxItems = Math.min(items.length, 3);
  for (var i = 0; i < maxItems; i++) {
    var itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.characters = "• " + items[i];
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
function createUserJourneyMap(data, theme, themeName) {
  var isWireframe = themeName === 'wireframe';
  var frame = figma.createFrame();
  frame.name = (data.title || 'User Journey Map') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(2400, 1200);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  var xOffset = 80;
  var stageWidth = 380;
  var spacing = 40;
  
  // Title
  var title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.characters = data.title || 'User Journey Map';
  title.fontSize = 28;
  title.fills = [{ type: 'SOLID', color: theme.text }];
  title.x = 80;
  title.y = 40;
  frame.appendChild(title);
  
  var stages = data.stages || [];
  for (var i = 0; i < stages.length; i++) {
    var stage = stages[i];
    var stageFrame = figma.createFrame();
    stageFrame.name = stage.name || 'Stage ' + (i + 1);
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
    
    var yPos = 24;
    var headerColor = isWireframe ? theme.primary : (theme.hierarchy && theme.hierarchy[i % theme.hierarchy.length]) || theme.primary;
    
    var headerBg = figma.createRectangle();
    headerBg.resize(stageWidth, 48);
    headerBg.x = 0;
    headerBg.y = 0;
    headerBg.fills = [{ type: 'SOLID', color: headerColor }];
    headerBg.cornerRadius = isWireframe ? 0 : 12;
    stageFrame.appendChild(headerBg);
    
    var headerMask = figma.createRectangle();
    headerMask.resize(stageWidth, 24);
    headerMask.x = 0;
    headerMask.y = 24;
    headerMask.fills = [{ type: 'SOLID', color: headerColor }];
    stageFrame.appendChild(headerMask);
    
    var stageName = figma.createText();
    stageName.fontName = { family: "Inter", style: "Semi Bold" };
    stageName.characters = stage.name || 'Stage';
    stageName.fontSize = 16;
    stageName.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stageName.x = 20;
    stageName.y = 14;
    stageName.resize(stageWidth - 40, stageName.height);
    stageFrame.appendChild(stageName);
    yPos = 68;
    
    if (stage.actions && stage.actions.length > 0) {
      yPos = addJourneySection(stageFrame, '📋 Actions', stage.actions, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.touchpoints && stage.touchpoints.length > 0) {
      yPos = addJourneySection(stageFrame, '📱 Touchpoints', stage.touchpoints, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.thoughts && stage.thoughts.length > 0) {
      yPos = addJourneySection(stageFrame, '💭 Thoughts', stage.thoughts, yPos, stageWidth, theme, isWireframe);
    }
    if (stage.painPoints && stage.painPoints.length > 0) {
      yPos = addJourneySection(stageFrame, '😟 Pain Points', stage.painPoints, yPos, stageWidth, theme, isWireframe, theme.warning);
    }
    if (stage.opportunities && stage.opportunities.length > 0) {
      yPos = addJourneySection(stageFrame, '💡 Opportunities', stage.opportunities, yPos, stageWidth, theme, isWireframe, theme.success);
    }
    
    var emotionText = figma.createText();
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
  
  frame.resize(Math.max(2400, xOffset + 80), 1200);
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
}

function addJourneySection(parent, title, items, yPos, width, theme, isWireframe, accentColor) {
  var sectionTitle = figma.createText();
  sectionTitle.fontName = { family: "Inter", style: "Semi Bold" };
  sectionTitle.characters = title;
  sectionTitle.fontSize = 12;
  sectionTitle.x = 20;
  sectionTitle.y = yPos;
  sectionTitle.fills = [{ type: 'SOLID', color: accentColor || (isWireframe ? theme.accent : { r: 0.4, g: 0.4, b: 0.4 }) }];
  parent.appendChild(sectionTitle);
  yPos += 24;
  
  for (var i = 0; i < items.length; i++) {
    var bullet = figma.createText();
    bullet.fontName = { family: "Inter", style: "Regular" };
    bullet.characters = "• " + items[i];
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
function createMindMap(data, theme, themeName) {
  var isWireframe = themeName === 'wireframe';
  var frame = figma.createFrame();
  frame.name = (data.title || 'Mind Map') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  var centerX = 1500;
  var centerY = 1000;
  
  var centralNode = createMindMapNode(data.centralTopic || 'Central Topic', centerX, centerY, 220, 110, true, theme, isWireframe, 0);
  frame.appendChild(centralNode);
  
  var branches = data.branches || [];
  var angleStep = (2 * Math.PI) / Math.max(branches.length, 1);
  var radius = 420;
  
  for (var i = 0; i < branches.length; i++) {
    var angle = i * angleStep - Math.PI / 2;
    var x = centerX + Math.cos(angle) * radius;
    var y = centerY + Math.sin(angle) * radius;
    
    var line = figma.createLine();
    var lineLength = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) - 120;
    line.resize(lineLength, 0);
    line.rotation = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    line.x = centerX + Math.cos(angle) * 110;
    line.y = centerY + Math.sin(angle) * 55;
    line.strokes = [{ type: 'SOLID', color: theme.border }];
    line.strokeWeight = 2;
    frame.appendChild(line);
    
    var branchNode = createMindMapNode(branches[i].topic || 'Branch', x, y, 180, 80, false, theme, isWireframe, 1);
    frame.appendChild(branchNode);
    
    var subBranches = branches[i].subBranches || [];
    for (var j = 0; j < subBranches.length; j++) {
      var subAngle = angle + ((j - (subBranches.length - 1) / 2) * 0.4);
      var subRadius = 240;
      var subX = x + Math.cos(subAngle) * subRadius;
      var subY = y + Math.sin(subAngle) * subRadius;
      
      var subLine = figma.createLine();
      subLine.resize(subRadius - 50, 0);
      subLine.rotation = subAngle * (180 / Math.PI);
      subLine.x = x + Math.cos(subAngle) * 90;
      subLine.y = y + Math.sin(subAngle) * 40;
      subLine.strokes = [{ type: 'SOLID', color: theme.border }];
      subLine.strokeWeight = 1.5;
      frame.appendChild(subLine);
      
      var subNode = createMindMapNode(subBranches[j] || 'Sub', subX, subY, 140, 60, false, theme, isWireframe, 2);
      frame.appendChild(subNode);
    }
  }
  
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
}

function createMindMapNode(text, x, y, width, height, isCentral, theme, isWireframe, level) {
  var node = figma.createFrame();
  node.resize(width, height);
  node.x = x - width / 2;
  node.y = y - height / 2;
  node.cornerRadius = isWireframe ? 0 : height / 2;
  
  var fillColor;
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
  
  var textNode = figma.createText();
  textNode.fontName = { family: "Inter", style: isCentral ? "Semi Bold" : "Medium" };
  textNode.characters = text || '';
  textNode.fontSize = isCentral ? 18 : 13;
  textNode.textAlignHorizontal = 'CENTER';
  textNode.textAlignVertical = 'CENTER';
  textNode.resize(width - 24, height);
  textNode.x = 12;
  textNode.y = 0;
  
  var needsWhiteText = isCentral || (!isWireframe && level < 2);
  textNode.fills = [{ type: 'SOLID', color: needsWhiteText ? { r: 1, g: 1, b: 1 } : theme.text }];
  node.appendChild(textNode);
  
  return node;
}

// ============= INFORMATION ARCHITECTURE GENERATOR =============
function createInformationArchitecture(data, theme, themeName) {
  var isWireframe = themeName === 'wireframe';
  var frame = figma.createFrame();
  frame.name = (data.name || 'Information Architecture') + (isWireframe ? ' (Wireframe)' : '');
  frame.resize(3000, 2000);
  frame.fills = [{ type: 'SOLID', color: theme.background }];
  
  var title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.characters = data.name || 'Information Architecture';
  title.fontSize = 28;
  title.fills = [{ type: 'SOLID', color: theme.text }];
  title.x = 80;
  title.y = 40;
  frame.appendChild(title);
  
  createIALevel(frame, data.sections || [], 80, 120, 0, theme, isWireframe);
  
  figma.viewport.scrollAndZoomIntoView([frame]);
  return frame;
}

function createIALevel(parent, items, x, y, level, theme, isWireframe) {
  var indent = level * 280;
  var itemHeight = 56;
  var spacing = 24;
  var currentY = y;
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var levelColor = isWireframe ? theme.primary : (theme.hierarchy && theme.hierarchy[Math.min(level, theme.hierarchy.length - 1)]) || theme.primary;
    
    var node = figma.createFrame();
    node.name = item.name || 'Item';
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
    
    var textNode = figma.createText();
    textNode.fontName = { family: "Inter", style: level === 0 ? "Semi Bold" : "Medium" };
    textNode.characters = item.name || 'Item';
    textNode.fontSize = level === 0 ? 14 : 12;
    textNode.x = 16;
    textNode.y = (itemHeight - 20) / 2;
    textNode.fills = [{ type: 'SOLID', color: level === 0 && !isWireframe ? { r: 1, g: 1, b: 1 } : theme.text }];
    node.appendChild(textNode);
    
    parent.appendChild(node);
    currentY += itemHeight + spacing;
    
    if (item.children && item.children.length > 0) {
      var line = figma.createLine();
      line.resize(20, 0);
      line.x = x + indent + 240;
      line.y = currentY - spacing / 2 - itemHeight / 2;
      line.strokes = [{ type: 'SOLID', color: theme.border }];
      line.strokeWeight = isWireframe ? 2 : 1.5;
      parent.appendChild(line);
      
      currentY = createIALevel(parent, item.children, x, currentY, level + 1, theme, isWireframe);
    }
  }
  
  return currentY;
}

// ============= MESSAGE HANDLER =============
figma.ui.onmessage = function(m) {
  if (m.type === 'store-session') {
    figma.clientStorage.setAsync('uxprobe_session', m.session);
  } else if (m.type === 'clear-session') {
    figma.clientStorage.deleteAsync('uxprobe_session');
  } else if (m.type === 'check-selection') {
    var s = figma.currentPage.selection;
    var hf = s.some(function(n) { return n.type === 'FRAME'; });
    figma.ui.postMessage({
      type: 'selection-info',
      hasSelection: s.length > 0,
      hasFrame: hf,
      hasPrototypeLinks: hf && checkForPrototypeLinks(s),
      selectedNodeName: s.length > 0 ? s[0].name : null
    });
  } else if (m.type === 'run-audit') {
    var sel = figma.currentPage.selection;
    var startScreen;
    for (var i = 0; i < sel.length; i++) {
      if (sel[i].type === 'FRAME') { startScreen = sel[i]; break; }
    }
    if (!startScreen) {
      figma.ui.postMessage({ type: 'audit-error', error: 'Please select a screen first' });
      return;
    }
    
    figma.ui.postMessage({ type: 'audit-progress', progress: 10 });
    
    var screensToAudit = m.mode === 'flow' ? traverse(startScreen) : [startScreen];
    figma.ui.postMessage({ type: 'audit-status', message: 'Found ' + screensToAudit.length + ' screen(s)' });
    
    var imgs = [];
    Promise.all(screensToAudit.map(function(screen) {
      return screen.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }).then(function(d) {
        imgs.push({ nodeId: screen.id, name: screen.name, imageData: 'data:image/png;base64,' + figma.base64Encode(d) });
      });
    })).then(function() {
      figma.ui.postMessage({ type: 'audit-progress', progress: 50 });
      return fetch(m.apiUrl + '/functions/v1/figma-audit-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + m.accessToken,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZXlqc3FhbHpjZGVqd3N2b3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDYwMDIsImV4cCI6MjA3NjE4MjAwMn0.jThP8cy8deaDkQZlTz6Bb0C1DU6praULawIej2vBghA'
        },
        body: JSON.stringify({
          frames: imgs,
          persona: { name: m.persona.name, description: m.persona.description, painPoints: m.persona.pain_points, goals: m.persona.goals },
          productContext: m.productContext,
          auditMode: m.mode
        })
      });
    }).then(function(r) { return r.json(); }).then(function(res) {
      figma.ui.postMessage({ type: 'audit-progress', progress: 100 });
      if (res.journeyNarrative) figma.ui.postMessage({ type: 'journey-narrative', narrative: res.journeyNarrative });
      figma.ui.postMessage({ type: 'audit-complete', issues: res.issues || [], screenCount: screensToAudit.length });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'audit-error', error: e.message });
    });
  } else if (m.type === 'navigate-to-node') {
    var n = figma.getNodeById(m.nodeId);
    if (n) {
      figma.viewport.scrollAndZoomIntoView([n]);
      figma.currentPage.selection = [n];
    }
  } else if (m.type === 'export-report') {
    figma.ui.postMessage({ type: 'export-ready', format: m.format, content: '# Report\n' + m.data.auditResults.length + ' issues' });
  } else if (m.type === 'import-persona') {
    loadFonts().then(function() {
      var th = getTheme(m.theme || 'wireframe', m.productCategory);
      createPersonaCard(m.data, th, m.theme || 'wireframe');
      figma.notify('✓ Persona imported!');
      figma.ui.postMessage({ type: 'import-success' });
    }).catch(function(e) {
      figma.notify('✗ Import failed: ' + e.message);
      figma.ui.postMessage({ type: 'import-error', error: e.message });
    });
  } else if (m.type === 'import-data') {
    loadFonts().then(function() {
      var data = JSON.parse(m.data);
      var th = getTheme(m.theme || 'wireframe', m.productCategory);
      var themeName = m.theme || 'wireframe';
      
      if (data.exportType === 'user_journey_map') {
        createUserJourneyMap(data.data, th, themeName);
      } else if (data.exportType === 'mind_map') {
        createMindMap(data.data, th, themeName);
      } else if (data.exportType === 'information_architecture') {
        createInformationArchitecture(data.data, th, themeName);
      }
      
      figma.notify('✓ Successfully imported into Figma!');
      figma.ui.postMessage({ type: 'import-success' });
    }).catch(function(e) {
      figma.notify('✗ Import failed: ' + e.message);
      figma.ui.postMessage({ type: 'import-error', error: e.message });
    });
  } else if (m.type === 'cancel') {
    figma.closePlugin();
  }
};
