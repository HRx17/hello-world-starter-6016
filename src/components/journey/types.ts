export interface JourneyStage {
  id: string;
  name: string;
  description?: string;
  actions: string[];
  touchpoints: string[];
  thoughts: string[];
  painPoints: string[];
  opportunities: string[];
  emotionLevel: number;
  // Position on canvas
  position: { x: number; y: number };
  // Connections to next stages (branching support)
  nextStages: string[];
  // Optional branch labels for each connection
  branchLabels?: Record<string, string>;
  // Stage type for visual distinction
  type?: 'start' | 'end' | 'decision' | 'action' | 'touchpoint';
}

export interface JourneyConnection {
  from: string;
  to: string;
  label?: string;
}

export interface JourneyMapData {
  title: string;
  persona?: string;
  stages: JourneyStage[];
}

export const STAGE_TEMPLATES = [
  { name: 'Awareness', type: 'start' as const, description: 'User becomes aware of the product/service' },
  { name: 'Research', type: 'action' as const, description: 'User researches options' },
  { name: 'Decision', type: 'decision' as const, description: 'User makes a decision between options' },
  { name: 'Purchase', type: 'action' as const, description: 'User completes a purchase or signup' },
  { name: 'Onboarding', type: 'action' as const, description: 'User goes through initial setup' },
  { name: 'Usage', type: 'action' as const, description: 'User actively uses the product' },
  { name: 'Support', type: 'touchpoint' as const, description: 'User seeks help or support' },
  { name: 'Retention', type: 'action' as const, description: 'User continues engagement' },
  { name: 'Advocacy', type: 'end' as const, description: 'User recommends to others' },
  { name: 'Churn', type: 'end' as const, description: 'User leaves or stops using' },
];

export const EMOTION_LABELS: Record<number, string> = {
  1: 'Frustrated',
  2: 'Disappointed', 
  3: 'Neutral',
  4: 'Satisfied',
  5: 'Delighted',
};
