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

// Check if selected screens have prototype links (deep recursive scan)
function checkForPrototypeLinks(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (hasPrototypeLinksRecursive(nodes[i])) {
      return true;
    }
  }
  return false;
}

// Recursively scan all nested elements for prototype links
function hasPrototypeLinksRecursive(node) {
  // Check the node itself
  if (node.reactions && node.reactions.length > 0) {
    for (var i = 0; i < node.reactions.length; i++) {
      var reaction = node.reactions[i];
      if (reaction.action && reaction.action.type === 'NODE' && reaction.action.destinationId) {
        return true;
      }
    }
  }
  
  // Recursively check all children at any depth
  if (node.children) {
    for (var j = 0; j < node.children.length; j++) {
      if (hasPrototypeLinksRecursive(node.children[j])) {
        return true;
      }
    }
  }
  
  return false;
}

// Traverse all prototype connections starting from a screen (deep nested scan)
function traverse(start) {
  var visited = {};
  var screens = [];
  var queue = [start];
  
  while (queue.length) {
    var current = queue.shift();
    if (!current || visited[current.id]) continue;
    
    visited[current.id] = true;
    screens.push(current);
    
    // Find all prototype links in this screen (including deeply nested elements)
    var linkedScreens = findAllPrototypeDestinations(current);
    for (var i = 0; i < linkedScreens.length; i++) {
      if (!visited[linkedScreens[i].id]) {
        queue.push(linkedScreens[i]);
      }
    }
  }
  
  return screens;
}

// Recursively find ALL prototype destinations from any element at any nesting level
function findAllPrototypeDestinations(node) {
  var destinations = [];
  var destinationIds = {};
  
  function scanNode(n) {
    // Check if this node has prototype reactions
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
    
    // Recursively scan all children (any type that can have children)
    if (n.children) {
      for (var j = 0; j < n.children.length; j++) {
        scanNode(n.children[j]);
      }
    }
  }
  
  scanNode(node);
  return destinations;
}

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
  } else if (m.type === 'import-persona' || m.type === 'import-data') {
    loadFonts().then(function() {
      var th = THEMES[m.theme] || THEMES.wireframe;
      var w = m.theme === 'wireframe';
      var fr = figma.createFrame();
      fr.resize(360, 300);
      fr.fills = [{ type: 'SOLID', color: th.background }];
      fr.strokes = [{ type: 'SOLID', color: th.border }];
      fr.strokeWeight = w ? 2 : 1;
      fr.cornerRadius = w ? 0 : 12;
      var t = figma.createText();
      t.fontName = { family: "Inter", style: "Bold" };
      t.characters = m.type === 'import-persona' ? m.data.name : 'Import';
      t.fontSize = 18;
      t.x = 20;
      t.y = 20;
      t.fills = [{ type: 'SOLID', color: th.text }];
      fr.appendChild(t);
      figma.viewport.scrollAndZoomIntoView([fr]);
      figma.notify('✓ Imported!');
      figma.ui.postMessage({ type: 'import-success' });
    }).catch(function(e) {
      figma.ui.postMessage({ type: 'import-error', error: e.message });
    });
  } else if (m.type === 'cancel') {
    figma.closePlugin();
  }
};
