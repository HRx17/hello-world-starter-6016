export interface BoundingBox {
  x: number; // X coordinate as percentage of image width (0-100)
  y: number; // Y coordinate as percentage of image height (0-100)
  width: number; // Width as percentage of image width (0-100)
  height: number; // Height as percentage of image height (0-100)
}

export interface Violation {
  heuristic: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  location: string;
  recommendation: string;
  pageElement?: string;
  boundingBox?: BoundingBox;
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
