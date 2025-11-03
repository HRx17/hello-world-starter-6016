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
  // Technical issues that should NEVER appear as heuristic violations
  const technicalPatterns = [
    // Meta tags and HTML structure
    /viewport\s+meta\s+tag/i,
    /missing\s+viewport/i,
    /meta\s+tag/i,
    /meta\s+name/i,
    /charset/i,
    /html\s+lang/i,
    /DOCTYPE/i,
    /<head>/i,
    /mobile.*viewport/i,
    /device-width/i,
    /initial-scale/i,
    
    // Accessibility attributes (code-level)
    /alt\s+attribute/i,
    /alt\s+text/i,
    /aria-label/i,
    /aria-labelledby/i,
    /aria-describedby/i,
    /aria-/i,
    /role=/i,
    /tabindex/i,
    /screen\s+reader/i,
    /WCAG\s+compliance/i,
    /accessibility\s+attribute/i,
    /for\s+attribute/i,
    /label.*attribute/i,
    
    // Form code issues
    /input.*lack.*label.*element/i,
    /missing.*label.*element/i,
    /associate.*label/i,
    /label.*element.*for/i,
    
    // Semantic HTML
    /semantic\s+html/i,
    /heading\s+hierarchy/i,
    /h1.*h2.*h3/i,
    /landmark\s+roles/i,
    /<main>/i,
    /<nav>/i,
    /<header>/i,
    /<footer>/i,
    
    // SEO and performance
    /meta\s+description/i,
    /og:image/i,
    /open\s+graph/i
  ];

  const genericPhrases = [
    'could be improved',
    'might be better',
    'consider adding',
    'may want to'
  ];

  return violations.filter(v => {
    const fullText = `${v.title} ${v.description} ${v.location} ${v.pageElement}`.toLowerCase();
    
    // CRITICAL: Reject any technical/implementation issues
    if (technicalPatterns.some(pattern => pattern.test(fullText))) {
      console.log(`  ❌ Rejected technical issue: ${v.title}`);
      return false;
    }

    // Reject if contains generic/vague phrases
    if (genericPhrases.some(phrase => fullText.includes(phrase))) {
      console.log(`  ⚠️  Generic phrasing: ${v.title}`);
      // Don't auto-reject, just warn
    }

    // Warn but don't reject if title is short (might still be valid)
    if (v.title.split(' ').length < 5) {
      console.log(`  ⚠️  Short title (keeping anyway): ${v.title}`);
    }

    // Warn but don't reject if element is vague
    if (!v.pageElement || v.pageElement === 'unknown' || v.pageElement === 'general') {
      console.log(`  ⚠️  Vague element (keeping anyway): ${v.title}`);
    }

    // Warn but don't reject if missing research (AI sometimes doesn't provide it)
    if (!v.researchBacking || v.researchBacking.length < 20) {
      console.log(`  ⚠️  Weak research backing (keeping anyway): ${v.title}`);
    }

    // Warn but don't reject if missing impact
    if (!v.userImpact || v.userImpact.length < 10) {
      console.log(`  ⚠️  Weak user impact (keeping anyway): ${v.title}`);
    }

    console.log(`  ✅ Validated: ${v.title}`);
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
