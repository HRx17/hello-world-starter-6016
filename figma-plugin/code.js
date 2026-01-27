"use strict";
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

// Theme color definitions
const THEMES = {
    blueprint: {
        primary: { r: 0.23, g: 0.51, b: 0.84 },
        secondary: { r: 0.93, g: 0.95, b: 0.98 },
        accent: { r: 0.06, g: 0.09, b: 0.16 },
        background: { r: 0.97, g: 0.98, b: 1 },
        text: { r: 0.07, g: 0.07, b: 0.07 },
        border: { r: 0.78, g: 0.85, b: 0.95 },
    },
    corporate: {
        primary: { r: 0.09, g: 0.09, b: 0.09 },
        secondary: { r: 0.96, g: 0.96, b: 0.96 },
        accent: { r: 0.0, g: 0.47, b: 0.42 },
        background: { r: 1, g: 1, b: 1 },
        text: { r: 0.07, g: 0.07, b: 0.07 },
        border: { r: 0.9, g: 0.9, b: 0.9 },
    },
    minimal: {
        primary: { r: 0.4, g: 0.4, b: 0.4 },
        secondary: { r: 0.98, g: 0.98, b: 0.98 },
        accent: { r: 0.2, g: 0.2, b: 0.2 },
        background: { r: 1, g: 1, b: 1 },
        text: { r: 0.13, g: 0.13, b: 0.13 },
        border: { r: 0.93, g: 0.93, b: 0.93 },
    }
};

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
        await figma.clientStorage.setAsync('uxprobe_session', msg.session);
    }
    else if (msg.type === 'clear-session') {
        await figma.clientStorage.deleteAsync('uxprobe_session');
    }
    else if (msg.type === 'import-persona') {
        try {
            await loadRequiredFonts();
            const theme = msg.theme || 'blueprint';
            await createPersonaCard(msg.data, theme);
            figma.notify('✓ Persona imported!');
            figma.ui.postMessage({ type: 'import-success' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            figma.notify('✗ Import failed: ' + errorMessage);
            figma.ui.postMessage({ type: 'import-error', error: errorMessage });
        }
    }
    else if (msg.type === 'import-data') {
        try {
            const data = JSON.parse(msg.data);
            const theme = msg.theme || 'blueprint';
            await loadRequiredFonts();
            if (data.exportType === 'user_journey_map') {
                await createUserJourneyMap(data.data, theme);
            }
            else if (data.exportType === 'mind_map') {
                await createMindMap(data.data, theme);
            }
            else if (data.exportType === 'information_architecture') {
                await createInformationArchitecture(data.data, theme);
            }
            figma.notify('✓ Successfully imported into Figma!');
            figma.ui.postMessage({ type: 'import-success' });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            figma.notify('✗ Import failed: ' + errorMessage);
            figma.ui.postMessage({ type: 'import-error', error: errorMessage });
        }
    }
    else if (msg.type === 'run-lint') {
        await runLintAudit(msg.scope);
    }
    else if (msg.type === 'run-full-audit') {
        await runFullAudit(msg.scope, msg.persona, msg.apiUrl, msg.accessToken);
    }
    else if (msg.type === 'navigate-to-node') {
        const node = figma.getNodeById(msg.nodeId);
        if (node && 'x' in node) {
            figma.viewport.scrollAndZoomIntoView([node]);
            figma.currentPage.selection = [node];
        }
    }
    else if (msg.type === 'export-report') {
        generateReport(msg.format, msg.data);
    }
    else if (msg.type === 'cancel') {
        figma.closePlugin();
    }
};

// ============= PERSONA CARD GENERATOR =============
async function createPersonaCard(persona, themeName) {
    const theme = THEMES[themeName];
    const frame = figma.createFrame();
    frame.name = `Persona - ${persona.name}`;
    frame.resize(360, 480);
    frame.cornerRadius = 16;
    frame.fills = [{ type: 'SOLID', color: theme.background }];
    frame.strokes = [{ type: 'SOLID', color: theme.border }];
    frame.strokeWeight = 1;
    frame.effects = [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.08 },
            offset: { x: 0, y: 8 },
            radius: 24,
            visible: true,
            blendMode: 'NORMAL'
        }];
    let yPos = 24;
    // Avatar placeholder
    const avatar = figma.createEllipse();
    avatar.resize(80, 80);
    avatar.x = 140;
    avatar.y = yPos;
    avatar.fills = [{ type: 'SOLID', color: theme.primary }];
    frame.appendChild(avatar);
    const avatarText = figma.createText();
    avatarText.fontName = { family: "Inter", style: "Bold" };
    avatarText.characters = (persona.name?.charAt(0)?.toUpperCase()) || 'P';
    avatarText.fontSize = 32;
    avatarText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
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
        descText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
        descText.textAlignHorizontal = 'CENTER';
        descText.resize(320, descText.height);
        descText.x = 20;
        descText.y = yPos;
        frame.appendChild(descText);
        yPos += descText.height + 20;
    }
    // Divider
    const divider = figma.createRectangle();
    divider.resize(320, 1);
    divider.x = 20;
    divider.y = yPos;
    divider.fills = [{ type: 'SOLID', color: theme.border }];
    frame.appendChild(divider);
    yPos += 20;
    // Goals
    if (persona.goals?.length > 0) {
        yPos = await addPersonaSection(frame, '🎯 Goals', persona.goals, yPos, theme);
    }
    // Pain Points
    if (persona.pain_points?.length > 0) {
        yPos = await addPersonaSection(frame, '😟 Pain Points', persona.pain_points, yPos, theme);
    }
    // Resize frame to fit content
    frame.resize(360, Math.max(480, yPos + 24));
    figma.viewport.scrollAndZoomIntoView([frame]);
}

async function addPersonaSection(parent, title, items, yPos, theme) {
    const titleText = figma.createText();
    titleText.fontName = { family: "Inter", style: "Semi Bold" };
    titleText.characters = title;
    titleText.fontSize = 12;
    titleText.fills = [{ type: 'SOLID', color: theme.primary }];
    titleText.x = 24;
    titleText.y = yPos;
    parent.appendChild(titleText);
    yPos += 22;
    for (const item of items.slice(0, 3)) {
        const itemText = figma.createText();
        itemText.fontName = { family: "Inter", style: "Regular" };
        itemText.characters = `• ${item}`;
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
async function createUserJourneyMap(data, themeName) {
    const theme = THEMES[themeName];
    const frame = figma.createFrame();
    frame.name = data.title || 'User Journey Map';
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
    for (const stage of data.stages || []) {
        const stageFrame = figma.createFrame();
        stageFrame.name = stage.name;
        stageFrame.resize(stageWidth, 900);
        stageFrame.x = xOffset;
        stageFrame.y = 120;
        stageFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        stageFrame.cornerRadius = 12;
        stageFrame.strokes = [{ type: 'SOLID', color: theme.border }];
        stageFrame.strokeWeight = 1;
        stageFrame.effects = [{
                type: 'DROP_SHADOW',
                color: { r: 0, g: 0, b: 0, a: 0.06 },
                offset: { x: 0, y: 4 },
                radius: 12,
                visible: true,
                blendMode: 'NORMAL'
            }];
        let yPos = 24;
        // Stage header
        const headerBg = figma.createRectangle();
        headerBg.resize(stageWidth, 48);
        headerBg.x = 0;
        headerBg.y = 0;
        headerBg.fills = [{ type: 'SOLID', color: theme.primary }];
        headerBg.cornerRadius = 12;
        stageFrame.appendChild(headerBg);
        // Fix corner radius for header (only top corners)
        const headerMask = figma.createRectangle();
        headerMask.resize(stageWidth, 24);
        headerMask.x = 0;
        headerMask.y = 24;
        headerMask.fills = [{ type: 'SOLID', color: theme.primary }];
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
        if (stage.actions?.length > 0) {
            yPos = await addJourneySection(stageFrame, '📋 Actions', stage.actions, yPos, stageWidth, theme);
        }
        if (stage.touchpoints?.length > 0) {
            yPos = await addJourneySection(stageFrame, '📱 Touchpoints', stage.touchpoints, yPos, stageWidth, theme);
        }
        if (stage.thoughts?.length > 0) {
            yPos = await addJourneySection(stageFrame, '💭 Thoughts', stage.thoughts, yPos, stageWidth, theme);
        }
        if (stage.painPoints?.length > 0) {
            yPos = await addJourneySection(stageFrame, '😟 Pain Points', stage.painPoints, yPos, stageWidth, theme);
        }
        if (stage.opportunities?.length > 0) {
            yPos = await addJourneySection(stageFrame, '💡 Opportunities', stage.opportunities, yPos, stageWidth, theme);
        }
        // Emotion indicator
        const emotionText = figma.createText();
        emotionText.fontName = { family: "Inter", style: "Medium" };
        emotionText.characters = `Emotion: ${getEmotionEmoji(stage.emotionLevel)}`;
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

async function addJourneySection(parent, title, items, yPos, width, theme) {
    const sectionTitle = figma.createText();
    sectionTitle.fontName = { family: "Inter", style: "Semi Bold" };
    sectionTitle.characters = title;
    sectionTitle.fontSize = 12;
    sectionTitle.x = 20;
    sectionTitle.y = yPos;
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    parent.appendChild(sectionTitle);
    yPos += 24;
    for (const item of items) {
        const bullet = figma.createText();
        bullet.fontName = { family: "Inter", style: "Regular" };
        bullet.characters = `• ${item}`;
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
async function createMindMap(data, themeName) {
    const theme = THEMES[themeName];
    const frame = figma.createFrame();
    frame.name = data.title || 'Mind Map';
    frame.resize(3000, 2000);
    frame.fills = [{ type: 'SOLID', color: theme.background }];
    const centerX = 1500;
    const centerY = 1000;
    // Central node
    const centralNode = await createMindMapNode(data.centralTopic, centerX, centerY, 220, 110, true, theme);
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
        line.strokeWeight = 2;
        frame.appendChild(line);
        const branchNode = await createMindMapNode(branches[i].topic, x, y, 180, 80, false, theme);
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
            const subNode = await createMindMapNode(subBranches[j], subX, subY, 140, 60, false, theme);
            frame.appendChild(subNode);
        }
    }
    figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createMindMapNode(text, x, y, width, height, isCentral, theme) {
    const node = figma.createFrame();
    node.resize(width, height);
    node.x = x - width / 2;
    node.y = y - height / 2;
    node.cornerRadius = height / 2;
    node.fills = [{ type: 'SOLID', color: isCentral ? theme.primary : { r: 1, g: 1, b: 1 } }];
    node.strokes = [{ type: 'SOLID', color: isCentral ? theme.primary : theme.border }];
    node.strokeWeight = isCentral ? 0 : 1.5;
    node.effects = [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.1 },
            offset: { x: 0, y: 4 },
            radius: 12,
            visible: true,
            blendMode: 'NORMAL'
        }];
    const textNode = figma.createText();
    textNode.fontName = { family: "Inter", style: isCentral ? "Semi Bold" : "Medium" };
    textNode.characters = text;
    textNode.fontSize = isCentral ? 18 : 13;
    textNode.textAlignHorizontal = 'CENTER';
    textNode.textAlignVertical = 'CENTER';
    textNode.resize(width - 24, height);
    textNode.x = 12;
    textNode.y = 0;
    textNode.fills = [{ type: 'SOLID', color: isCentral ? { r: 1, g: 1, b: 1 } : theme.text }];
    node.appendChild(textNode);
    return node;
}

// ============= INFORMATION ARCHITECTURE GENERATOR =============
async function createInformationArchitecture(data, themeName) {
    const theme = THEMES[themeName];
    const frame = figma.createFrame();
    frame.name = data.name || 'Information Architecture';
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
    await createIALevel(frame, data.sections || [], 80, 120, 0, theme);
    figma.viewport.scrollAndZoomIntoView([frame]);
}

async function createIALevel(parent, items, x, y, level, theme) {
    const indent = level * 280;
    const itemHeight = 56;
    const spacing = 24;
    let currentY = y;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const box = figma.createFrame();
        box.name = item.name;
        box.resize(220, itemHeight);
        box.x = x + indent;
        box.y = currentY;
        box.fills = [{ type: 'SOLID', color: level === 0 ? theme.primary : { r: 1, g: 1, b: 1 } }];
        box.cornerRadius = 8;
        box.strokes = [{ type: 'SOLID', color: level === 0 ? theme.primary : theme.border }];
        box.strokeWeight = level === 0 ? 0 : 1;
        box.effects = [{
                type: 'DROP_SHADOW',
                color: { r: 0, g: 0, b: 0, a: 0.06 },
                offset: { x: 0, y: 2 },
                radius: 8,
                visible: true,
                blendMode: 'NORMAL'
            }];
        const text = figma.createText();
        text.fontName = { family: "Inter", style: level === 0 ? "Semi Bold" : "Medium" };
        text.characters = item.name;
        text.fontSize = level === 0 ? 14 : 13;
        text.fills = [{ type: 'SOLID', color: level === 0 ? { r: 1, g: 1, b: 1 } : theme.text }];
        text.textAlignVertical = 'CENTER';
        text.resize(200, itemHeight);
        text.x = 12;
        text.y = 0;
        box.appendChild(text);
        parent.appendChild(box);
        // Draw connector to children
        if (item.children?.length > 0) {
            const connectorX = x + indent + 220;
            const connectorY = currentY + itemHeight / 2;
            const hLine = figma.createLine();
            hLine.resize(30, 0);
            hLine.x = connectorX;
            hLine.y = connectorY;
            hLine.strokes = [{ type: 'SOLID', color: theme.border }];
            hLine.strokeWeight = 2;
            parent.appendChild(hLine);
            currentY = await createIALevel(parent, item.children, x, currentY, level + 1, theme);
        }
        else {
            currentY += itemHeight + spacing;
        }
    }
    return currentY;
}

// ============= AUDIT ENGINE =============
async function runLintAudit(scope) {
    const issues = [];
    const nodes = await getNodesForScope(scope);
    figma.ui.postMessage({ type: 'audit-progress', progress: 20 });
    for (const node of nodes) {
        // Check for poor naming
        if (node.name.match(/^(Frame|Group|Rectangle|Ellipse|Text)\s*\d*$/i)) {
            issues.push({
                nodeId: node.id,
                title: 'Poor Layer Naming',
                description: `Layer "${node.name}" has a generic name. Use semantic naming for better organization.`,
                severity: 'low',
                category: 'naming'
            });
        }
        // Check for broken interactions (frames without links)
        if (node.type === 'FRAME' && 'reactions' in node) {
            const hasReaction = node.reactions?.length > 0;
            if (!hasReaction && node.name.toLowerCase().includes('button')) {
                issues.push({
                    nodeId: node.id,
                    title: 'Missing Interaction',
                    description: `Button "${node.name}" has no interaction defined.`,
                    severity: 'medium',
                    category: 'interaction'
                });
            }
        }
        // Check for small touch targets
        if ('width' in node && 'height' in node) {
            const minSize = 44;
            if (node.width < minSize || node.height < minSize) {
                if (node.name.toLowerCase().includes('button') || node.name.toLowerCase().includes('link') || node.name.toLowerCase().includes('tap')) {
                    issues.push({
                        nodeId: node.id,
                        title: 'Small Touch Target',
                        description: `Element "${node.name}" is ${Math.round(node.width)}x${Math.round(node.height)}px. Minimum recommended is 44x44px.`,
                        severity: 'high',
                        category: 'accessibility'
                    });
                }
            }
        }
    }
    figma.ui.postMessage({ type: 'audit-progress', progress: 100 });
    figma.ui.postMessage({ type: 'lint-results', issues });
}

async function runFullAudit(scope, persona, apiUrl, accessToken) {
    const issues = [];
    const nodes = await getNodesForScope(scope);
    figma.ui.postMessage({ type: 'audit-progress', progress: 10 });
    // Run lint checks first
    for (const node of nodes) {
        if (node.name.match(/^(Frame|Group|Rectangle|Ellipse|Text)\s*\d*$/i)) {
            issues.push({
                nodeId: node.id,
                title: 'Poor Layer Naming',
                description: `Layer "${node.name}" has a generic name.`,
                severity: 'low',
                category: 'naming'
            });
        }
        if ('width' in node && 'height' in node && (node.width < 44 || node.height < 44)) {
            if (node.name.toLowerCase().match(/button|link|tap|click/)) {
                issues.push({
                    nodeId: node.id,
                    title: 'Small Touch Target',
                    description: `"${node.name}" is only ${Math.round(node.width)}x${Math.round(node.height)}px.`,
                    severity: 'high',
                    category: 'accessibility'
                });
            }
        }
    }
    figma.ui.postMessage({ type: 'audit-progress', progress: 40 });
    // Export selection as image for AI analysis
    if (nodes.length > 0 && persona) {
        try {
            const exportNode = nodes.find(n => n.type === 'FRAME') || nodes[0];
            if ('exportAsync' in exportNode) {
                const imageData = await exportNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } });
                const base64 = figma.base64Encode(imageData);
                const imageUrl = `data:image/png;base64,${base64}`;
                figma.ui.postMessage({ type: 'audit-progress', progress: 60 });
                // Call AI endpoint
                const response = await fetch(`${apiUrl}/functions/v1/figma-audit-ai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZXlqc3FhbHpjZGVqd3N2b3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDYwMDIsImV4cCI6MjA3NjE4MjAwMn0.jThP8cy8deaDkQZlTz6Bb0C1DU6praULawIej2vBghA'
                    },
                    body: JSON.stringify({
                        imageData: imageUrl,
                        persona: {
                            name: persona.name,
                            description: persona.description,
                            painPoints: persona.pain_points,
                            goals: persona.goals
                        }
                    })
                });
                figma.ui.postMessage({ type: 'audit-progress', progress: 80 });
                if (response.ok) {
                    const aiResult = await response.json();
                    if (aiResult.issues) {
                        for (const aiIssue of aiResult.issues) {
                            issues.push({
                                nodeId: exportNode.id,
                                title: aiIssue.title,
                                description: aiIssue.description,
                                severity: aiIssue.severity || 'medium',
                                category: 'ai-heuristic'
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('AI audit error:', error);
        }
    }
    figma.ui.postMessage({ type: 'audit-progress', progress: 100 });
    figma.ui.postMessage({ type: 'audit-complete', issues });
}

async function getNodesForScope(scope) {
    if (scope === 'selection') {
        return [...figma.currentPage.selection];
    }
    else if (scope === 'page') {
        return [...figma.currentPage.children];
    }
    else if (scope === 'flow') {
        // Get nodes connected via prototype links
        const flowNodes = [];
        const startPoints = figma.currentPage.flowStartingPoints;
        for (const startPoint of startPoints) {
            const node = figma.getNodeById(startPoint.nodeId);
            if (node && 'type' in node) {
                flowNodes.push(node);
            }
        }
        return flowNodes.length > 0 ? flowNodes : [...figma.currentPage.selection];
    }
    return [];
}

// ============= REPORT GENERATOR =============
function generateReport(format, data) {
    const { auditResults, persona } = data;
    let content = '';
    if (format === 'markdown') {
        content = generateMarkdownReport(auditResults, persona);
    }
    else {
        content = generateHtmlReport(auditResults, persona);
    }
    figma.ui.postMessage({ type: 'export-ready', format, content });
}

function generateMarkdownReport(issues, persona) {
    let md = `# Pre-Usability Audit Report\n\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    if (persona) {
        md += `## Persona Context\n\n`;
        md += `| Attribute | Value |\n`;
        md += `|-----------|-------|\n`;
        md += `| Name | ${persona.name} |\n`;
        md += `| Description | ${persona.description || 'N/A'} |\n`;
        if (persona.goals?.length) {
            md += `| Goals | ${persona.goals.join(', ')} |\n`;
        }
        if (persona.pain_points?.length) {
            md += `| Pain Points | ${persona.pain_points.join(', ')} |\n`;
        }
        md += '\n';
    }
    md += `## Executive Summary\n\n`;
    md += `- **Total Issues:** ${issues.length}\n`;
    md += `- **High Severity:** ${issues.filter(i => i.severity === 'high').length}\n`;
    md += `- **Medium Severity:** ${issues.filter(i => i.severity === 'medium').length}\n`;
    md += `- **Low Severity:** ${issues.filter(i => i.severity === 'low').length}\n\n`;
    md += `## Detailed Findings\n\n`;
    issues.forEach((issue, i) => {
        md += `### ${i + 1}. ${issue.title}\n\n`;
        md += `**Severity:** ${issue.severity.toUpperCase()}\n\n`;
        md += `**Category:** ${issue.category}\n\n`;
        md += `${issue.description}\n\n`;
        md += `---\n\n`;
    });
    return md;
}

function generateHtmlReport(issues, persona) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Pre-Usability Audit Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937; }
    h1 { color: #111827; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
    h2 { color: #374151; margin-top: 32px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; }
    .stat { background: white; padding: 16px; border-radius: 8px; }
    .stat .value { font-size: 28px; font-weight: 700; }
    .stat .label { font-size: 12px; color: #6b7280; }
    .high .value { color: #dc2626; }
    .medium .value { color: #d97706; }
    .low .value { color: #2563eb; }
    .issue { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #e5e7eb; }
    .issue.high { border-left-color: #dc2626; }
    .issue.medium { border-left-color: #d97706; }
    .issue.low { border-left-color: #2563eb; }
    .issue h3 { margin: 0 0 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-right: 8px; }
    .badge.high { background: #fef2f2; color: #dc2626; }
    .badge.medium { background: #fffbeb; color: #d97706; }
    .badge.low { background: #eff6ff; color: #2563eb; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🔍 Pre-Usability Audit Report</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
  
  ${persona ? `
  <h2>Persona Context</h2>
  <p><strong>${persona.name}</strong></p>
  <p>${persona.description || ''}</p>
  ` : ''}
  
  <div class="summary">
    <div class="summary-grid">
      <div class="stat"><div class="value">${issues.length}</div><div class="label">Total</div></div>
      <div class="stat high"><div class="value">${issues.filter(i => i.severity === 'high').length}</div><div class="label">High</div></div>
      <div class="stat medium"><div class="value">${issues.filter(i => i.severity === 'medium').length}</div><div class="label">Medium</div></div>
      <div class="stat low"><div class="value">${issues.filter(i => i.severity === 'low').length}</div><div class="label">Low</div></div>
    </div>
  </div>
  
  <h2>Detailed Findings</h2>
  ${issues.map((issue, i) => `
    <div class="issue ${issue.severity}">
      <span class="badge ${issue.severity}">${issue.severity.toUpperCase()}</span>
      <span class="badge" style="background:#f3f4f6;color:#374151;">${issue.category}</span>
      <h3>${i + 1}. ${issue.title}</h3>
      <p>${issue.description}</p>
    </div>
  `).join('')}
</body>
</html>`;
}

function getEmotionEmoji(level) {
    const emojis = ['😞', '😟', '😐', '🙂', '😊'];
    return emojis[Math.max(0, Math.min(4, level - 1))] || '😐';
}
