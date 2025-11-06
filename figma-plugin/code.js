// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Check for stored session on load
figma.clientStorage.getAsync('uxprobe_session').then((session) => {
  if (session) {
    figma.ui.postMessage({ type: 'restore-session', session });
  }
}).catch(() => {
  // No stored session, user will need to login
});

// Load all required fonts upfront
async function loadRequiredFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Regular" })
  ]);
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'store-session') {
    // Store session data for persistence
    await figma.clientStorage.setAsync('uxprobe_session', msg.session);
  } else if (msg.type === 'clear-session') {
    // Clear stored session on logout
    await figma.clientStorage.deleteAsync('uxprobe_session');
  } else if (msg.type === 'import-data') {
    try {
      console.log('Parsing data:', msg.data);
      const data = JSON.parse(msg.data);
      console.log('Parsed data:', data);
      
      if (data.exportType === 'user_journey_map') {
        console.log('Creating user journey map with data:', data.data);
        await createUserJourneyMap(data.data);
      } else if (data.exportType === 'mind_map') {
        await createMindMap(data.data);
      } else if (data.exportType === 'information_architecture') {
        await createInformationArchitecture(data.data);
      }
      
      figma.notify('✓ Successfully imported into Figma!');
      figma.ui.postMessage({ type: 'import-success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Import error:', errorMessage, error);
      figma.notify('✗ Import failed: ' + errorMessage);
      figma.ui.postMessage({ type: 'import-error', error: errorMessage });
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
  title.fontName = { family: "Inter", style: "Bold" };
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
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    stageName.fontName = { family: "Inter", style: "Semi Bold" };
    stageName.characters = stage.name;
    stageName.fontSize = 20;
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
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    emotionText.fontName = { family: "Inter", style: "Regular" };
    emotionText.characters = `Emotion: ${getEmotionEmoji(stage.emotionLevel)}`;
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
  title.fontName = { family: "Inter", style: "Bold" };
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
    text.fontName = { family: "Inter", style: "Medium" };
    text.characters = item.name;
    text.fontSize = 16;
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
  textNode.fontName = { family: "Inter", style: isCentral ? "Semi Bold" : "Medium" };
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
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  sectionTitle.fontName = { family: "Inter", style: "Semi Bold" };
  sectionTitle.characters = title;
  sectionTitle.fontSize = 14;
  sectionTitle.x = 20;
  sectionTitle.y = yPos;
  sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  parent.appendChild(sectionTitle);
  yPos += 30;
  
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  for (const item of items) {
    const bullet = figma.createText();
    bullet.fontName = { family: "Inter", style: "Regular" };
    bullet.characters = `• ${item}`;
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
}