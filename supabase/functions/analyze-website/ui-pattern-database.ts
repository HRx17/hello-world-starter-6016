/**
 * UI PATTERN DATABASE
 * Based on Baymard Institute's methodology of mapping 8,000+ UI components to specific outcomes
 * This database contains research-backed patterns and their expected outcomes
 */

export interface UIPattern {
  component: string;
  category: string;
  goodPatterns: Pattern[];
  badPatterns: Pattern[];
  heuristics: string[];
}

export interface Pattern {
  description: string;
  indicators: string[];  // What to look for in HTML/screenshot
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  researchBacked: boolean;
  conversionImpact?: string;  // e.g., "1% conversion increase"
}

// Navigation Patterns (Research-backed)
export const NAVIGATION_PATTERNS: UIPattern = {
  component: 'Navigation',
  category: 'Information Architecture',
  goodPatterns: [
    {
      description: 'Clear, consistent navigation with recognizable labels',
      indicators: ['<nav>', 'aria-label="main"', 'consistent class names'],
      severity: 'high',
      recommendation: 'Navigation follows industry standards',
      researchBacked: true,
    },
    {
      description: 'Breadcrumbs for deep navigation',
      indicators: ['aria-label="breadcrumb"', 'ol.breadcrumb'],
      severity: 'medium',
      recommendation: 'Breadcrumbs present for wayfinding',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'Mega-menu with hover-only interaction (causes navigation fatigue)',
      indicators: [':hover', 'dropdown', 'no click handler', 'position: absolute'],
      severity: 'high',
      recommendation: 'Replace hover-only mega-menus with click-to-open dropdowns. Hover-based menus cause accidental opens and navigation fatigue (Baymard: Wayfair example)',
      researchBacked: true,
      conversionImpact: 'Significant reduction in task completion',
    },
    {
      description: 'Inconsistent navigation labels across pages',
      indicators: ['Products vs Our Offerings', 'Sign In vs Log In variations'],
      severity: 'medium',
      recommendation: 'Use consistent terminology: choose one label (e.g., "Products") and use it everywhere. Violates Consistency heuristic #4',
      researchBacked: true,
    },
  ],
  heuristics: ['Consistency and Standards (#4)', 'Recognition Rather than Recall (#6)'],
};

// Form Patterns (High-impact for conversion)
export const FORM_PATTERNS: UIPattern = {
  component: 'Forms',
  category: 'Input & Validation',
  goodPatterns: [
    {
      description: 'Inline validation with clear error messages',
      indicators: ['type="email"', 'pattern=', 'aria-invalid', 'error message visible'],
      severity: 'high',
      recommendation: 'Form has inline validation - excellent error prevention',
      researchBacked: true,
    },
    {
      description: 'Placeholder text showing format examples',
      indicators: ['placeholder="MM/DD/YYYY"', 'placeholder="name@example.com"'],
      severity: 'medium',
      recommendation: 'Format examples provided - reduces memory load',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'Validation only on submit (no inline validation)',
      indicators: ['no real-time validation', 'errors only after submit'],
      severity: 'high',
      recommendation: 'Add inline validation that shows errors as users type. Waiting until submit frustrates users and increases form abandonment. Violates Error Prevention (#5)',
      researchBacked: true,
      conversionImpact: '0.5-2% reduction in form completion',
    },
    {
      description: 'No visual distinction between required/optional fields',
      indicators: ['no asterisk', 'no "required" indicator', 'no aria-required'],
      severity: 'medium',
      recommendation: 'Mark required fields with asterisk (*) or "required" label. Users shouldn\'t have to guess. One airline had 90%+ mobile abandonment from this mistake (Baymard guideline #686)',
      researchBacked: true,
      conversionImpact: 'Up to 90% mobile abandonment rate',
    },
  ],
  heuristics: ['Error Prevention (#5)', 'Help Users Recognize Errors (#9)', 'Recognition Rather than Recall (#6)'],
};

// Button & CTA Patterns
export const BUTTON_PATTERNS: UIPattern = {
  component: 'Buttons',
  category: 'Interactive Elements',
  goodPatterns: [
    {
      description: 'Clear visual feedback (hover, active, focus states)',
      indicators: [':hover', ':focus', ':active', 'cursor: pointer'],
      severity: 'high',
      recommendation: 'Buttons have proper interactive states',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'No hover/focus/active states visible',
      indicators: ['no :hover', 'no :focus', 'no state change'],
      severity: 'high',
      recommendation: 'Add visible hover, focus, and active states to all buttons. Users need feedback that buttons are clickable and responsive. Violates Visibility of System Status (#1)',
      researchBacked: true,
    },
    {
      description: 'Low-contrast buttons (fails WCAG AA)',
      indicators: ['contrast ratio < 3:1', 'light gray on white'],
      severity: 'high',
      recommendation: 'Increase button contrast to minimum 4.5:1 ratio. Current contrast fails accessibility standards and reduces discoverability for all users',
      researchBacked: true,
    },
    {
      description: 'Inconsistent primary button styling',
      indicators: ['different colors across pages', 'varying sizes'],
      severity: 'medium',
      recommendation: 'Use consistent styling for primary CTAs across all pages. Users learn interaction patterns - inconsistency increases cognitive load. Violates Consistency (#4)',
      researchBacked: true,
    },
  ],
  heuristics: ['Visibility of System Status (#1)', 'Consistency and Standards (#4)'],
};

// Error Message Patterns
export const ERROR_PATTERNS: UIPattern = {
  component: 'Error Messages',
  category: 'Feedback',
  goodPatterns: [
    {
      description: 'Specific, actionable error messages in plain language',
      indicators: ['specific field mentioned', 'solution provided', 'plain language'],
      severity: 'high',
      recommendation: 'Error messages are clear and actionable',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'Generic or technical error messages',
      indicators: ['Error 404', 'Invalid input', 'Error occurred', 'no specific field'],
      severity: 'high',
      recommendation: 'Replace generic errors with specific, helpful messages. Instead of "Invalid input", use "Email format invalid. Please use: name@example.com". Violates Help Users Recognize Errors (#9)',
      researchBacked: true,
      conversionImpact: 'Significant increase in form abandonment',
    },
  ],
  heuristics: ['Help Users Recognize, Diagnose, and Recover from Errors (#9)', 'Match Between System and Real World (#2)'],
};

// Loading States
export const LOADING_PATTERNS: UIPattern = {
  component: 'Loading Indicators',
  category: 'System Feedback',
  goodPatterns: [
    {
      description: 'Clear loading indicators with progress feedback',
      indicators: ['spinner', 'progress bar', 'percentage', '"Loading..." text'],
      severity: 'high',
      recommendation: 'Loading states provide clear feedback',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'No loading feedback on button clicks or actions',
      indicators: ['no spinner', 'no disabled state', 'silent submission'],
      severity: 'high',
      recommendation: 'Show loading state during all async actions. Add spinner/text like "Processing..." and disable button to prevent double-clicks. Violates Visibility of System Status (#1)',
      researchBacked: true,
    },
  ],
  heuristics: ['Visibility of System Status (#1)'],
};

// Modal/Dialog Patterns
export const MODAL_PATTERNS: UIPattern = {
  component: 'Modals & Dialogs',
  category: 'Overlays',
  goodPatterns: [
    {
      description: 'Multiple exit methods (X button, ESC key, click outside)',
      indicators: ['×', 'close button', 'ESC listener', 'backdrop click'],
      severity: 'high',
      recommendation: 'Modal has proper exit mechanisms',
      researchBacked: true,
    },
  ],
  badPatterns: [
    {
      description: 'Modal traps users (no X, no ESC, no backdrop click)',
      indicators: ['no close button', 'no ESC handler', 'no backdrop dismiss'],
      severity: 'high',
      recommendation: 'Add X button, ESC key handler, and click-outside-to-close. Users must have clear exit paths. Violates User Control and Freedom (#3)',
      researchBacked: true,
      conversionImpact: 'Users abandon task entirely',
    },
    {
      description: 'Destructive action without confirmation',
      indicators: ['delete button', 'no confirmation dialog', 'immediate action'],
      severity: 'high',
      recommendation: 'Add confirmation dialog: "Delete [X] items? This cannot be undone." Prevents costly mistakes. Violates Error Prevention (#5)',
      researchBacked: true,
    },
  ],
  heuristics: ['User Control and Freedom (#3)', 'Error Prevention (#5)'],
};

// All patterns combined
export const UI_PATTERN_DATABASE: UIPattern[] = [
  NAVIGATION_PATTERNS,
  FORM_PATTERNS,
  BUTTON_PATTERNS,
  ERROR_PATTERNS,
  LOADING_PATTERNS,
  MODAL_PATTERNS,
];

// Helper function to find applicable patterns
export function findApplicablePatterns(html: string, category?: string): UIPattern[] {
  return UI_PATTERN_DATABASE.filter(pattern => 
    !category || pattern.category === category
  );
}

// Helper to check if pattern indicators exist in HTML
export function detectPattern(html: string, pattern: Pattern): boolean {
  const htmlLower = html.toLowerCase();
  return pattern.indicators.some(indicator => 
    htmlLower.includes(indicator.toLowerCase())
  );
}
