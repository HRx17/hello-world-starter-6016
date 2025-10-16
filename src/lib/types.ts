export interface Violation {
  heuristic: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  location: string;
  recommendation: string;
  pageElement?: string;
}

export interface Strength {
  heuristic: string;
  description: string;
}

export interface AnalysisResult {
  url: string;
  websiteName: string;
  overallScore: number;
  violations: Violation[];
  strengths: Strength[];
  screenshot?: string;
}
