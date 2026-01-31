export interface SitemapNode {
  id: string;
  label: string;
  parentId: string | null;
  description?: string;
  type: 'page' | 'section' | 'category' | 'feature';
  position: { x: number; y: number };
}

export const NODE_TYPE_COLORS: Record<string, string> = {
  page: 'border-blue-500/50 bg-blue-500/5',
  section: 'border-purple-500/50 bg-purple-500/5',
  category: 'border-amber-500/50 bg-amber-500/5',
  feature: 'border-green-500/50 bg-green-500/5',
};

export const NODE_TYPE_ICONS: Record<string, string> = {
  page: '📄',
  section: '📁',
  category: '🏷️',
  feature: '⚡',
};
