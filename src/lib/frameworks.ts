export const FRAMEWORKS = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
  { value: "nextjs", label: "Next.js" },
  { value: "nuxt", label: "Nuxt" },
  { value: "other", label: "Other" },
] as const;

export type Framework = typeof FRAMEWORKS[number]["value"];
