export interface HeuristicOption {
  value: string;
  label: string;
  description: string;
  count?: number;
}

export const HEURISTIC_SETS: HeuristicOption[] = [
  {
    value: "nn_10",
    label: "Nielsen's 10 Heuristics",
    description: "Jakob Nielsen's classic 10 usability heuristics",
    count: 10,
  },
  {
    value: "nn_20",
    label: "Nielsen's 20 Heuristics",
    description: "Extended set of 20 usability heuristics",
    count: 20,
  },
  {
    value: "wcag",
    label: "WCAG Guidelines",
    description: "Web Content Accessibility Guidelines (WCAG 2.1)",
  },
  {
    value: "custom",
    label: "Custom Selection",
    description: "Choose specific heuristics to include in analysis",
  },
];

export const INDIVIDUAL_HEURISTICS: HeuristicOption[] = [
  // Nielsen's 10 Core Heuristics
  { value: "visibility", label: "Visibility of System Status", description: "System should inform users about what's happening" },
  { value: "match", label: "Match Between System and Real World", description: "Use familiar language and conventions" },
  { value: "control", label: "User Control and Freedom", description: "Provide undo/redo and easy exits" },
  { value: "consistency", label: "Consistency and Standards", description: "Follow platform conventions" },
  { value: "error_prevention", label: "Error Prevention", description: "Prevent problems before they occur" },
  { value: "recognition", label: "Recognition Rather than Recall", description: "Minimize memory load" },
  { value: "flexibility", label: "Flexibility and Efficiency", description: "Accelerators for expert users" },
  { value: "aesthetic", label: "Aesthetic and Minimalist Design", description: "Remove irrelevant information" },
  { value: "error_recovery", label: "Help Users Recognize and Recover from Errors", description: "Clear error messages with solutions" },
  { value: "help", label: "Help and Documentation", description: "Provide searchable, context-sensitive help" },
  
  // Extended Heuristics (NN 20)
  { value: "learnability", label: "Learnability", description: "Easy to learn for first-time users" },
  { value: "memorability", label: "Memorability", description: "Easy to remember after period of non-use" },
  { value: "efficiency", label: "Efficiency of Use", description: "Fast task completion for experienced users" },
  { value: "error_rate", label: "Low Error Rate", description: "Users make few errors and can recover easily" },
  { value: "satisfaction", label: "User Satisfaction", description: "Pleasant and satisfying to use" },
  { value: "accessibility", label: "Accessibility", description: "Usable by people with diverse abilities" },
  { value: "mobile", label: "Mobile Responsiveness", description: "Optimized for mobile devices" },
  { value: "performance", label: "Performance", description: "Fast loading and responsive interactions" },
  { value: "security", label: "Security and Privacy", description: "Protect user data and privacy" },
  { value: "localization", label: "Localization", description: "Adapts to different languages and cultures" },
  
  // WCAG Principles
  { value: "perceivable", label: "Perceivable (WCAG)", description: "Information must be presentable to users" },
  { value: "operable", label: "Operable (WCAG)", description: "UI components must be operable" },
  { value: "understandable", label: "Understandable (WCAG)", description: "Information and operation must be understandable" },
  { value: "robust", label: "Robust (WCAG)", description: "Content must be robust for assistive technologies" },
];

export const getHeuristicsForSet = (setType: string): string[] => {
  switch (setType) {
    case "nn_10":
      return INDIVIDUAL_HEURISTICS.slice(0, 10).map(h => h.value);
    case "nn_20":
      return INDIVIDUAL_HEURISTICS.slice(0, 20).map(h => h.value);
    case "wcag":
      return INDIVIDUAL_HEURISTICS.filter(h => h.label.includes("WCAG")).map(h => h.value);
    default:
      return [];
  }
};
