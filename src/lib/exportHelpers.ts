// Helper functions for exporting UX research data

export function downloadJSON(data: any, filename: string) {
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

export function downloadHTML(htmlContent: string, filename: string) {
  const htmlWithStyles = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 40px; 
      background: #f5f5f5;
      color: #333;
    }
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { 
      font-size: 32px; 
      margin-bottom: 24px; 
      color: #1a1a1a;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 16px;
    }
    h2 { 
      font-size: 24px; 
      margin: 32px 0 16px; 
      color: #4f46e5;
    }
    h3 { 
      font-size: 18px; 
      margin: 20px 0 12px; 
      color: #1a1a1a;
    }
    .node, .stage, .branch { 
      margin: 16px 0; 
      padding: 20px; 
      border: 2px solid #e5e5e5;
      border-radius: 8px;
      background: #fafafa;
    }
    .node-level-1 { margin-left: 40px; }
    .node-level-2 { margin-left: 80px; }
    .node-level-3 { margin-left: 120px; }
    .badge { 
      display: inline-block;
      padding: 4px 12px; 
      background: #4f46e5;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      margin: 4px;
    }
    .badge-outline {
      background: white;
      color: #4f46e5;
      border: 1px solid #4f46e5;
    }
    .emotion { 
      display: inline-block;
      font-size: 24px; 
      margin-right: 8px;
    }
    ul { 
      margin: 12px 0 12px 24px;
      list-style: disc;
    }
    li { margin: 8px 0; line-height: 1.6; }
    .pain-point { color: #dc2626; }
    .opportunity { color: #16a34a; }
    .muted { color: #666; font-size: 14px; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlWithStyles], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function generateMindMapHTML(data: any): string {
  const centralTopic = data.centralTopic || data.nodes?.find((n: any) => n.id === 'root')?.label || 'Mind Map';
  const nodes = data.nodes || [];
  
  let html = `<h1>Mind Map: ${centralTopic}</h1>`;
  
  const renderNode = (node: any, level: number = 0): string => {
    const children = nodes.filter((n: any) => n.parentId === node.id);
    const levelClass = level > 0 ? `node-level-${Math.min(level, 3)}` : '';
    
    let nodeHtml = `
      <div class="node ${levelClass}">
        <h${Math.min(level + 2, 4)}>${node.label}</h${Math.min(level + 2, 4)}>
        ${node.notes ? `<p class="muted">${node.notes}</p>` : ''}
      </div>
    `;
    
    if (children.length > 0) {
      nodeHtml += children.map(child => renderNode(child, level + 1)).join('');
    }
    
    return nodeHtml;
  };
  
  const rootNode = nodes.find((n: any) => n.id === 'root');
  if (rootNode) {
    html += renderNode(rootNode);
  }
  
  return html;
}

export function generateIAHTML(data: any): string {
  const title = data.title || 'Information Architecture';
  const nodes = data.nodes || [];
  
  let html = `<h1>${title}</h1>`;
  
  const renderNode = (node: any, level: number = 0): string => {
    const children = nodes.filter((n: any) => n.parentId === node.id);
    const levelClass = level > 0 ? `node-level-${Math.min(level, 3)}` : '';
    
    let nodeHtml = `
      <div class="node ${levelClass}">
        <h${Math.min(level + 2, 4)}>${node.label}</h${Math.min(level + 2, 4)}>
        ${node.type ? `<span class="badge badge-outline">${node.type}</span>` : ''}
        ${node.description ? `<p class="muted">${node.description}</p>` : ''}
      </div>
    `;
    
    if (children.length > 0) {
      nodeHtml += children.map(child => renderNode(child, level + 1)).join('');
    }
    
    return nodeHtml;
  };
  
  const rootNode = nodes.find((n: any) => n.parentId === null);
  if (rootNode) {
    html += renderNode(rootNode);
  }
  
  return html;
}

export function generateJourneyHTML(data: any): string {
  const title = data.title || 'User Journey Map';
  const stages = data.stages || [];
  
  const getEmotionEmoji = (level: number): string => {
    if (level >= 4) return '😊';
    if (level >= 3) return '😐';
    return '😟';
  };
  
  let html = `<h1>${title}</h1>`;
  
  stages.forEach((stage: any, index: number) => {
    html += `
      <div class="stage">
        <h2>
          <span class="badge">${index + 1}</span>
          ${stage.name}
          <span class="emotion">${getEmotionEmoji(stage.emotionLevel || 3)}</span>
        </h2>
        
        ${stage.actions?.length > 0 ? `
          <div>
            <h3>Actions</h3>
            <ul>
              ${stage.actions.map((action: string) => `<li>${action}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${stage.touchpoints?.length > 0 ? `
          <div>
            <h3>Touchpoints</h3>
            <div>
              ${stage.touchpoints.map((tp: string) => `<span class="badge badge-outline">${tp}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${stage.thoughts?.length > 0 ? `
          <div>
            <h3>Thoughts</h3>
            <ul>
              ${stage.thoughts.map((thought: string) => `<li><em>"${thought}"</em></li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${stage.painPoints?.length > 0 ? `
          <div>
            <h3 class="pain-point">Pain Points</h3>
            <ul>
              ${stage.painPoints.map((pain: string) => `<li class="pain-point">⚠️ ${pain}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${stage.opportunities?.length > 0 ? `
          <div>
            <h3 class="opportunity">Opportunities</h3>
            <ul>
              ${stage.opportunities.map((opp: string) => `<li class="opportunity">💡 ${opp}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  return html;
}
