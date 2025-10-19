// Stage 4: Cross-Validation and Deduplication
// Removes false positives and duplicate findings across heuristics

interface HeuristicViolation {
  heuristic: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  pageElement: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  researchBacking: string;
  userImpact: string;
}

interface ValidationResult {
  validatedViolations: HeuristicViolation[];
  duplicatesRemoved: number;
  falsePositivesRemoved: number;
}

export function crossValidateFindings(
  allViolations: HeuristicViolation[]
): ValidationResult {
  console.log('Stage 4: Cross-validating findings...');
  console.log(`  Input: ${allViolations.length} violations`);

  // Step 1: Remove exact duplicates
  const uniqueViolations = removeDuplicates(allViolations);
  const duplicatesRemoved = allViolations.length - uniqueViolations.length;

  // Step 2: Remove violations that are too generic (likely false positives)
  const validatedViolations = removeGenericFindings(uniqueViolations);
  const falsePositivesRemoved = uniqueViolations.length - validatedViolations.length;

  // Step 3: Merge similar violations across heuristics
  const mergedViolations = mergeSimilarViolations(validatedViolations);

  console.log(`  Output: ${mergedViolations.length} validated violations`);
  console.log(`  Removed: ${duplicatesRemoved} duplicates, ${falsePositivesRemoved} false positives`);

  return {
    validatedViolations: mergedViolations,
    duplicatesRemoved,
    falsePositivesRemoved
  };
}

function removeDuplicates(violations: HeuristicViolation[]): HeuristicViolation[] {
  const seen = new Set<string>();
  return violations.filter(v => {
    const key = `${v.title}|${v.location}|${v.pageElement}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function removeGenericFindings(violations: HeuristicViolation[]): HeuristicViolation[] {
  const genericPhrases = [
    'could be improved',
    'might be better',
    'consider adding',
    'may want to',
    'should possibly',
    'generally',
    'overall',
    'in general'
  ];

  return violations.filter(v => {
    const text = `${v.title} ${v.description}`.toLowerCase();
    
    // Reject if contains generic phrases
    if (genericPhrases.some(phrase => text.includes(phrase))) {
      console.log(`  Rejected generic finding: ${v.title}`);
      return false;
    }

    // Reject if title is too short (< 5 words = too vague)
    if (v.title.split(' ').length < 5) {
      console.log(`  Rejected vague title: ${v.title}`);
      return false;
    }

    // Reject if no specific element identified
    if (!v.pageElement || v.pageElement === 'unknown' || v.pageElement === 'general') {
      console.log(`  Rejected non-specific element: ${v.title}`);
      return false;
    }

    // Reject if bounding box is missing for visual violations
    if (v.severity === 'high' && !v.boundingBox) {
      console.log(`  Rejected high severity without bounding box: ${v.title}`);
      return false;
    }

    return true;
  });
}

function mergeSimilarViolations(violations: HeuristicViolation[]): HeuristicViolation[] {
  const merged: HeuristicViolation[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < violations.length; i++) {
    if (processed.has(i)) continue;

    const current = violations[i];
    let mostSevere = current;

    // Find similar violations
    for (let j = i + 1; j < violations.length; j++) {
      if (processed.has(j)) continue;

      const other = violations[j];
      
      // Check if they're about the same element/location
      const isSimilarLocation = 
        current.location.toLowerCase() === other.location.toLowerCase() ||
        current.pageElement.toLowerCase() === other.pageElement.toLowerCase();

      // Check if titles are similar (>60% word overlap)
      const similarityScore = calculateTitleSimilarity(current.title, other.title);
      
      if (isSimilarLocation && similarityScore > 0.6) {
        console.log(`  Merging: \"${current.title}\" with \"${other.title}\"`);
        processed.add(j);
        
        // Keep the more severe violation
        if (getSeverityWeight(other.severity) > getSeverityWeight(mostSevere.severity)) {
          mostSevere = other;
        }
      }
    }

    merged.push(mostSevere);
    processed.add(i);
  }

  return merged;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(' '));
  const words2 = new Set(title2.toLowerCase().split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function getSeverityWeight(severity: string): number {
  switch (severity) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}
