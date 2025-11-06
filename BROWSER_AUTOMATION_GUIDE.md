# Browser Automation for Enhanced Analysis

## Current State

Your UXProbe tool currently uses:
1. **Firecrawl** for scraping and screenshots
2. **Gemini Vision (multimodal AI)** for visual analysis
3. **Per-heuristic specialized prompts** for focused evaluation

This provides good static analysis but misses **interaction states**.

## The Missing Piece: Interactive State Capture

To achieve human-level precision, you need to capture:
1. **Error states** (what happens when forms are submitted incorrectly)
2. **Hover states** (dropdown menus, tooltips)
3. **Focus states** (keyboard navigation indicators)
4. **Loading states** (how the UI behaves during operations)
5. **Modal/dialog states** (popups, confirmations)

## Why Puppeteer Doesn't Work in Edge Functions

Supabase Edge Functions (Deno Deploy) cannot run Puppeteer because:
- No support for Chrome/Chromium binary
- Limited compute resources
- Timeout constraints (functions must respond quickly)

## Solution Options

### Option 1: External Browser Automation Service (Recommended)

Use a hosted headless browser service that your edge function can call:

#### **1.1 Browserless.io**
```typescript
// supabase/functions/capture-interactive-states/index.ts
const response = await fetch('https://chrome.browserless.io/screenshot', {
  method: 'POST',
  headers: {
    'Cache-Control': 'no-cache',
    'Authorization': `Bearer ${Deno.env.get('BROWSERLESS_API_KEY')}`
  },
  body: JSON.stringify({
    url: targetUrl,
    options: {
      fullPage: true,
      type: 'png'
    },
    // Interact before screenshot
    gotoOptions: {
      waitUntil: 'networkidle0'
    },
    // Execute JavaScript to trigger states
    evaluate: `
      // Click submit without filling form
      const form = document.querySelector('form');
      if (form) {
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.click();
      }
      
      // Wait for error messages
      await new Promise(r => setTimeout(r, 1000));
    `
  })
});
```

**Pros:**
- Fully managed, no infrastructure
- Can execute JavaScript, take screenshots, get HTML
- Pay-per-use pricing

**Cons:**
- Paid service (~$30-50/month for moderate use)
- External dependency

#### **1.2 ScrapingBee**
Similar to Browserless, with screenshot and JavaScript execution:

```typescript
const url = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&screenshot=true&js_scenario={"instructions":[{"click":"form button[type='submit']"},{"wait":1000}]}`;
```

#### **1.3 Firecrawl with JavaScript Execution**
Check if Firecrawl supports JavaScript execution in their API. Some web scraping services allow running scripts before capture.

### Option 2: Separate Automation Service (Advanced)

Deploy Puppeteer on a separate server:

```typescript
// Separate service (not edge function) - deploy on Railway, Fly.io, or AWS Lambda
import puppeteer from 'puppeteer';

export async function captureInteractionStates(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

  const states: Record<string, string> = {};

  // 1. Default state
  states.default = await page.screenshot({ fullPage: true, encoding: 'base64' });

  // 2. Error state (empty form submission)
  const forms = await page.$$('form');
  if (forms.length > 0) {
    await forms[0].evaluate(form => {
      const submit = form.querySelector('button[type="submit"]');
      if (submit) (submit as HTMLElement).click();
    });
    await page.waitForTimeout(1000);
    states.formError = await page.screenshot({ fullPage: true, encoding: 'base64' });
  }

  // 3. Hover states (capture dropdown menus)
  const navItems = await page.$$('nav a, nav button');
  if (navItems.length > 0) {
    await navItems[0].hover();
    await page.waitForTimeout(500);
    states.navHover = await page.screenshot({ fullPage: true, encoding: 'base64' });
  }

  // 4. Focus states (keyboard navigation)
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  states.focusState = await page.screenshot({ fullPage: true, encoding: 'base64' });

  await browser.close();
  return states;
}
```

Then call this service from your edge function:
```typescript
// In analyze-website edge function
const interactionStates = await fetch('https://your-automation-service.com/capture', {
  method: 'POST',
  body: JSON.stringify({ url })
});
```

**Pros:**
- Full control over automation
- No per-request costs after setup

**Cons:**
- Infrastructure to maintain
- Higher initial setup complexity

### Option 3: Hybrid Approach (Start Here)

1. **Phase 1 (Now):** Maximize static screenshot analysis with improved prompts ✅ (Done)
2. **Phase 2:** Add Browserless.io for interaction states (quick to implement)
3. **Phase 3:** Migrate to self-hosted Puppeteer if volume justifies it

## Implementation Roadmap

### Immediate (Already Done ✅)
- Enhanced visual analysis prompts
- Human-like evaluation instructions
- Better spatial and layout analysis

### Next Steps (Add Browser Automation)

1. **Sign up for Browserless.io** (or similar service)
2. **Add API key to Supabase secrets:**
   ```bash
   supabase secrets set BROWSERLESS_API_KEY=your_key_here
   ```

3. **Create new edge function** `capture-interaction-states`:
   ```typescript
   // Captures: default, error, hover, focus states
   // Returns: Object with multiple base64 screenshots
   ```

4. **Update analyze-website to use multiple screenshots:**
   ```typescript
   // Stage 1: Analyze each state
   const defaultAnalysis = await analyzeScreenshot(states.default);
   const errorAnalysis = await analyzeScreenshot(states.formError);
   const hoverAnalysis = await analyzeScreenshot(states.navHover);
   
   // Merge findings
   ```

5. **Update prompts to analyze interaction states:**
   ```typescript
   // Heuristic 9: Error Recovery
   "Here's a screenshot of the page AFTER submitting an empty form.
   Analyze the error messages shown..."
   ```

## Cost Estimates

**Browserless.io:**
- Free tier: 100 requests/month
- Startup: $50/month for 5000 requests
- For 100 analyses/day: ~$50-100/month

**ScrapingBee:**
- Similar pricing structure
- $49/month for 150K API credits

**Self-hosted Puppeteer (Railway/Fly.io):**
- ~$10-20/month for basic tier
- No per-request costs
- Requires maintenance

## Testing the Current Enhancement

The prompts have been updated to act more human-like. Test with:
```bash
# Analyze a website
curl -X POST https://your-project.supabase.co/functions/v1/analyze-website \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

You should see more human-focused analysis:
- "This design looks dated (circa 2012)" instead of "Poor CSS"
- "Users can't tell if button was clicked - no visual feedback" instead of "Missing loading state"
- "Cluttered layout with competing CTAs" instead of "Too many buttons"

## Next Steps

1. ✅ Test the improved prompts with current static analysis
2. Evaluate if interaction state capture justifies the cost
3. If yes, start with Browserless.io (easiest to implement)
4. Once validated, consider self-hosting for cost optimization

The tool will already be significantly more accurate with the prompt improvements. Interaction state capture is the next level of enhancement.
