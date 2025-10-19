// Stage 2: Structural Analysis - Programmatic HTML/CSS/Accessibility Analysis
// No AI needed - uses deterministic code analysis

export interface StructuralFindings {
  accessibility: {
    missingAltText: string[];
    missingAriaLabels: string[];
    missingFormLabels: string[];
    headingStructure: {
      issues: string[];
      hierarchy: string[];
    };
    landmarkRoles: {
      present: string[];
      missing: string[];
    };
  };
  forms: {
    inputs: Array<{
      id: string;
      type: string;
      hasLabel: boolean;
      hasPlaceholder: boolean;
      hasValidation: boolean;
      isRequired: boolean;
    }>;
    validationPatterns: {
      inlineValidation: boolean;
      clientSideValidation: boolean;
      requiredIndicators: boolean;
    };
  };
  navigation: {
    primaryNav: {
      type: string;
      items: number;
      hasDropdowns: boolean;
      isMobileResponsive: boolean;
    };
    breadcrumbs: boolean;
    skipLinks: boolean;
  };
  buttons: {
    total: number;
    withAriaLabels: number;
    withDisabledState: number;
    types: string[];
  };
  semanticHTML: {
    usesSemanticTags: boolean;
    divSoupScore: number; // Higher = worse (too many divs vs semantic tags)
    missingLandmarks: string[];
  };
}

export function performStructuralAnalysis(html: string, markdown: string): StructuralFindings {
  console.log('Stage 2: Starting structural analysis...');

  const findings: StructuralFindings = {
    accessibility: {
      missingAltText: [],
      missingAriaLabels: [],
      missingFormLabels: [],
      headingStructure: {
        issues: [],
        hierarchy: []
      },
      landmarkRoles: {
        present: [],
        missing: []
      }
    },
    forms: {
      inputs: [],
      validationPatterns: {
        inlineValidation: false,
        clientSideValidation: false,
        requiredIndicators: false
      }
    },
    navigation: {
      primaryNav: {
        type: 'unknown',
        items: 0,
        hasDropdowns: false,
        isMobileResponsive: false
      },
      breadcrumbs: false,
      skipLinks: false
    },
    buttons: {
      total: 0,
      withAriaLabels: 0,
      withDisabledState: 0,
      types: []
    },
    semanticHTML: {
      usesSemanticTags: false,
      divSoupScore: 0,
      missingLandmarks: []
    }
  };

  // Extract images without alt text
  const imgRegex = /<img(?![^>]*alt=)[^>]*>/gi;
  const imgsWithoutAlt = html.match(imgRegex) || [];
  findings.accessibility.missingAltText = imgsWithoutAlt.map((img, idx) => 
    `Image ${idx + 1}: ${img.substring(0, 100)}...`
  );

  // Extract form inputs
  const inputRegex = /<input[^>]*>/gi;
  const inputs = html.match(inputRegex) || [];
  inputs.forEach(input => {
    const idMatch = input.match(/id=["']([^"']+)["']/);
    const typeMatch = input.match(/type=["']([^"']+)["']/);
    const hasRequired = /required/i.test(input);
    const hasAriaLabel = /aria-label/i.test(input);
    
    findings.forms.inputs.push({
      id: idMatch ? idMatch[1] : 'unknown',
      type: typeMatch ? typeMatch[1] : 'text',
      hasLabel: false, // Will check separately
      hasPlaceholder: /placeholder/i.test(input),
      hasValidation: /pattern|minlength|maxlength/i.test(input),
      isRequired: hasRequired
    });
  });

  // Check for form labels
  const labelRegex = /<label[^>]*for=["']([^"']+)["'][^>]*>/gi;
  const labels = html.match(labelRegex) || [];
  const labeledInputIds = labels.map(label => {
    const match = label.match(/for=["']([^"']+)["']/);
    return match ? match[1] : null;
  }).filter(Boolean);

  findings.forms.inputs = findings.forms.inputs.map(input => ({
    ...input,
    hasLabel: labeledInputIds.includes(input.id)
  }));

  findings.accessibility.missingFormLabels = findings.forms.inputs
    .filter(input => !input.hasLabel)
    .map(input => `Input #${input.id} (type: ${input.type})`);

  // Check validation patterns
  findings.forms.validationPatterns.inlineValidation = 
    /oninput|onblur|@input|@blur/i.test(html);
  findings.forms.validationPatterns.clientSideValidation = 
    /pattern=|minlength=|maxlength=|required/i.test(html);
  findings.forms.validationPatterns.requiredIndicators = 
    /\*|required|aria-required/i.test(html);

  // Check navigation
  findings.navigation.breadcrumbs = 
    /breadcrumb|aria-label=["']breadcrumb["']/i.test(html);
  findings.navigation.skipLinks = 
    /skip to|skip-to-content|skip navigation/i.test(html);

  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
  if (navMatch) {
    const navContent = navMatch[1];
    const links = navContent.match(/<a[^>]*>/gi) || [];
    findings.navigation.primaryNav.items = links.length;
    findings.navigation.primaryNav.hasDropdowns = 
      /dropdown|submenu|aria-haspopup/i.test(navContent);
    findings.navigation.primaryNav.isMobileResponsive = 
      /hamburger|menu-toggle|mobile-menu/i.test(html);
  }

  // Count buttons
  const buttonRegex = /<button[^>]*>|<a[^>]*role=["']button["'][^>]*>/gi;
  const buttons = html.match(buttonRegex) || [];
  findings.buttons.total = buttons.length;
  findings.buttons.withAriaLabels = buttons.filter(btn => /aria-label/i.test(btn)).length;
  findings.buttons.withDisabledState = buttons.filter(btn => /disabled|:disabled/i.test(btn)).length;

  // Check semantic HTML
  const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
  const hasSemantic = semanticTags.some(tag => 
    new RegExp(`<${tag}[^>]*>`, 'i').test(html)
  );
  findings.semanticHTML.usesSemanticTags = hasSemantic;

  const divCount = (html.match(/<div/gi) || []).length;
  const semanticCount = semanticTags.reduce((count, tag) => 
    count + (html.match(new RegExp(`<${tag}`, 'gi')) || []).length, 0
  );
  findings.semanticHTML.divSoupScore = semanticCount > 0 
    ? Math.round((divCount / semanticCount) * 10) / 10 
    : divCount;

  // Check for ARIA landmarks
  const landmarkRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo'];
  landmarkRoles.forEach(role => {
    const hasRole = new RegExp(`role=["']${role}["']|<${role}`, 'i').test(html);
    if (hasRole) {
      findings.accessibility.landmarkRoles.present.push(role);
    } else {
      findings.accessibility.landmarkRoles.missing.push(role);
    }
  });

  // Check heading hierarchy
  const headings = html.match(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi) || [];
  const headingLevels = headings.map(h => {
    const match = h.match(/<h([1-6])/);
    return match ? parseInt(match[1]) : 0;
  });
  
  findings.accessibility.headingStructure.hierarchy = headingLevels.map(String);
  
  // Check for skipped levels
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i-1] > 1) {
      findings.accessibility.headingStructure.issues.push(
        `Heading level skipped: h${headingLevels[i-1]} to h${headingLevels[i]}`
      );
    }
  }

  console.log('Stage 2 complete: Structural analysis done');
  return findings;
}
