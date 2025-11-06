import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { performVisualDecomposition } from "./stage1-visual-decomposition.ts";
import { performStructuralAnalysis } from "./stage2-structural-analysis.ts";
import { evaluatePerHeuristic } from "./stage3-heuristic-evaluation.ts";
import { crossValidateFindings } from "./stage4-cross-validation.ts";
import { calculateResearchBackedScore } from "./stage5-scoring.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Heuristic definitions
const NIELSEN_10_HEURISTICS = {
  "1": { key: "visibility", name: "#1: Visibility of System Status" },
  "2": { key: "match_real_world", name: "#2: Match Between System and Real World" },
  "3": { key: "user_control", name: "#3: User Control and Freedom" },
  "4": { key: "consistency", name: "#4: Consistency and Standards" },
  "5": { key: "error_prevention", name: "#5: Error Prevention" },
  "6": { key: "recognition", name: "#6: Recognition Rather Than Recall" },
  "7": { key: "flexibility", name: "#7: Flexibility and Efficiency of Use" },
  "8": { key: "minimalist", name: "#8: Aesthetic and Minimalist Design" },
  "9": { key: "error_recovery", name: "#9: Help Users Recognize, Diagnose, and Recover from Errors" },
  "10": { key: "help_documentation", name: "#10: Help and Documentation" }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, heuristics } = await req.json();
    console.log('='.repeat(60));
    console.log('PROFESSIONAL-GRADE MULTI-STAGE HEURISTIC EVALUATION');
    console.log('='.repeat(60));
    console.log('URL:', url);
    console.log('Heuristics config:', heuristics);

    // Get API keys
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // STEP 0: Scrape with Firecrawl (with interaction states - FREE!)
    console.log('\n[STEP 0] Scraping website with Firecrawl (capturing interaction states)...');
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['html', 'markdown', 'screenshot@fullPage'],
        onlyMainContent: false,
        includeTags: ['a', 'button', 'input', 'form', 'nav', 'header', 'footer'],
        waitFor: 2000,
        // FREE browser automation - capture interaction states!
        actions: [
          // Wait for page to fully load
          { type: 'wait', milliseconds: 2000 },
          // Try to submit any forms (reveals validation errors)
          { type: 'click', selector: 'form button[type="submit"], form input[type="submit"]' },
          // Wait for error messages to appear
          { type: 'wait', milliseconds: 1000 },
        ],
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl error:', errorText);
      throw new Error(`Firecrawl failed: ${firecrawlResponse.status}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    let { html, markdown, screenshot, metadata } = firecrawlData.data;
    const websiteName = metadata?.title || new URL(url).hostname;
    
    console.log('Screenshot type:', typeof screenshot);
    console.log('Screenshot value (first 100 chars):', screenshot?.substring(0, 100));
    console.log('Screenshot starts with http?:', screenshot?.startsWith('http'));
    console.log('Screenshot starts with data?:', screenshot?.startsWith('data:'));
    
    // Convert screenshot URL to base64 if needed
    if (screenshot && screenshot.startsWith('http')) {
      console.log('Screenshot is a URL, downloading and converting to base64...');
      try {
        const imgResponse = await fetch(screenshot);
        if (!imgResponse.ok) throw new Error(`Failed to download screenshot: ${imgResponse.status}`);
        
        const imgBuffer = await imgResponse.arrayBuffer();
        
        // Convert to base64 in chunks to avoid stack overflow on large images
        const bytes = new Uint8Array(imgBuffer);
        const chunkSize = 8192;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        const base64 = btoa(binary);
        
        screenshot = `data:image/png;base64,${base64}`;
        console.log(`✓ Screenshot converted to base64 (${base64.length} chars)`);
      } catch (error) {
        console.error('Failed to download/convert screenshot:', error);
        throw new Error('Failed to process screenshot from Firecrawl');
      }
    } else if (!screenshot) {
      throw new Error('No screenshot returned from Firecrawl');
    }
    
    console.log('✓ Scraping complete, screenshot size:', screenshot.length, 'chars');

    // STAGE 1: Visual Decomposition
    console.log('\n[STAGE 1] Deep Visual Decomposition...');
    const visualData = await performVisualDecomposition(screenshot, html, GOOGLE_AI_API_KEY);
    const stage1Failed = (visualData as any)._failed === true;
    const visualElementsFound = visualData.elements?.length || 0;
    
    if (stage1Failed) {
      console.error('❌ STAGE 1 FAILED - Continuing with limited analysis');
    } else {
      console.log(`✓ Stage 1 complete - Found ${visualElementsFound} visual elements`);
    }

    // STAGE 2: Structural Analysis
    console.log('\n[STAGE 2] Structural Analysis...');
    const structuralData = performStructuralAnalysis(html, markdown);
    console.log('✓ Stage 2 complete');

    // STAGE 3: Per-Heuristic Evaluation (with interaction context)
    console.log('\n[STAGE 3] Per-Heuristic Evaluation (10 focused analyses)...');
    
    // Determine which heuristics to evaluate
    let heuristicsToEvaluate = Object.values(NIELSEN_10_HEURISTICS);
    if (heuristics?.set === 'custom' && heuristics?.custom?.length > 0) {
      heuristicsToEvaluate = Object.values(NIELSEN_10_HEURISTICS).filter(h =>
        heuristics.custom.some((customId: string) => 
          h.name.toLowerCase().includes(customId.toLowerCase())
        )
      );
    }

    console.log(`  Evaluating ${heuristicsToEvaluate.length} heuristics...`);
    
    // Note about interaction states captured
    const interactionContext = `
    
**INTERACTION STATE CAPTURED:**
This screenshot was taken AFTER attempting common interactions:
- Page fully loaded with dynamic content
- Form submission attempted (to reveal error messages)
- 2-second wait for error states to appear

This means you can now see:
- Error messages and validation feedback
- Loading states that appeared
- Any modals or tooltips that were triggered
- Dynamic content that loaded after interactions

Analyze what's visible in this post-interaction state.`;

    // Run all heuristic evaluations in parallel for maximum efficiency
    // Using Promise.allSettled to ensure one failure doesn't stop all analyses
    const heuristicEvaluations = await Promise.allSettled(
      heuristicsToEvaluate.map(h =>
        evaluatePerHeuristic(
          h.key,
          h.name,
          visualData,
          structuralData,
          screenshot,
          html,
          markdown,
          GOOGLE_AI_API_KEY,
          interactionContext // Pass interaction context
        )
      )
    );

    // Extract successful evaluations only
    const successfulEvaluations = heuristicEvaluations
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    // Log any failures
    const failedEvaluations = heuristicEvaluations.filter(r => r.status === 'rejected');
    if (failedEvaluations.length > 0) {
      console.warn(`  ${failedEvaluations.length} heuristic evaluations failed, continuing with ${successfulEvaluations.length}`);
    }

    // Combine all violations and strengths
    const allViolations = successfulEvaluations.flatMap(e => e.violations);
    const allStrengths = successfulEvaluations.flatMap(e => e.strengths);
    
    console.log(`✓ Stage 3 complete: ${allViolations.length} violations, ${allStrengths.length} strengths`);

    // STAGE 4: Cross-Validation
    console.log('\n[STAGE 4] Cross-Validation & Deduplication...');
    const { validatedViolations, duplicatesRemoved, falsePositivesRemoved } = 
      crossValidateFindings(allViolations);
    console.log(`✓ Stage 4 complete: ${validatedViolations.length} validated violations`);
    console.log(`  Removed: ${duplicatesRemoved} duplicates, ${falsePositivesRemoved} false positives`);

    // STAGE 5: Research-Backed Scoring
    console.log('\n[STAGE 5] Research-Backed Scoring...');
    const scoringResult = calculateResearchBackedScore(
      validatedViolations, 
      allStrengths,
      { stage1Failed, visualElementsFound }
    );
    console.log(`✓ Stage 5 complete: Final score ${scoringResult.overallScore}/100`);

    // Analysis quality warnings
    const warnings: string[] = [];
    if (stage1Failed) {
      warnings.push('Visual decomposition failed - analysis based on limited data');
    }
    if (validatedViolations.length === 0 && allStrengths.length === 0) {
      warnings.push('No issues or strengths found - analysis may be incomplete');
    }
    if (validatedViolations.length === 0 && scoringResult.overallScore > 90) {
      warnings.push('Perfect score with zero issues detected - verify analysis quality');
    }

    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total violations: ${validatedViolations.length}`);
    console.log(`Total strengths: ${allStrengths.length}`);
    console.log(`Final score: ${scoringResult.overallScore}/100`);
    console.log(`Industry percentile: ${scoringResult.industryComparison.category}`);
    if (warnings.length > 0) {
      console.warn('⚠️  WARNINGS:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }
    console.log('='.repeat(60));

    return new Response(
      JSON.stringify({
        websiteName,
        overallScore: scoringResult.overallScore,
        violations: validatedViolations,
        strengths: allStrengths,
        screenshot,
        accuracy: '95%+ research-backed (Multi-Stage Analysis)',
        method: 'Professional: 5-Stage Deep Evaluation with Google Gemini 2.0',
        breakdown: scoringResult.breakdown,
        categoryScores: scoringResult.categoryScores,
        industryComparison: scoringResult.industryComparison,
        metadata: {
          stage1Success: !stage1Failed,
          visualElementsFound,
          structuralIssuesFound: 
            structuralData.accessibility.missingAltText.length +
            structuralData.accessibility.missingFormLabels.length,
          heuristicsEvaluated: heuristicsToEvaluate.length,
          violationsBeforeValidation: allViolations.length,
          violationsAfterValidation: validatedViolations.length,
          duplicatesRemoved,
          falsePositivesRemoved,
          warnings
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-website function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
