// Strip emojis and decorative symbols. The AI is told not to use them but
// some still slip through; this is the safety net.
function stripDecorative(text) {
  if (!text) return text;
  return text
    // Unicode emoji ranges
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F2FF}]/gu, '')
    .replace(/\uFE0F/g, '')
    // Common stray decorative chars seen in AI output
    .replace(/[★☆✓✗✅❌⚠️→←↑↓►▶◆●○■□]/g, '')
    // Collapse runs of blank lines created by the strip
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function generateSummary(formData, formType, formCategory) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    return {
      summary: 'AI Summary unavailable — ANTHROPIC_API_KEY not configured.\n\nTo enable AI summaries, add your Anthropic API key to the .env file.',
      generated: false
    };
  }

  const formLabels = {
    market_appraisal: 'Market Appraisal',
    vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement',
    purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase Agreement',
    vendor_forms: 'Vendor Forms',
    buyer_forms: 'Buyer Forms'
  };
  const formLabel = formLabels[formType] || formType;
  const categoryLabel = formCategory === 'vendor' ? 'Vendor' : 'Buyer';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are a senior NZ real estate compliance analyst. Review this completed ${categoryLabel} ${formLabel} and write a concise briefing for the listing agent.

Form data:
${JSON.stringify(formData, null, 2)}

Output rules — follow exactly:
- Use plain markdown only. Section headings start with "## " (h2). No h1, no h3, no horizontal rules.
- No emojis. No decorative symbols of any kind (no ✓, ✗, ⚠, →, ★, etc.).
- No bold. No italics. Plain prose only.
- Bullets use "- " (a single dash + space). One blank line between sections.
- Do not repeat field labels verbatim. Synthesise into readable sentences.
- Total length: 180 words or less.

Use these sections, in order, omitting any that would be empty:

## Client
One sentence: name, role (purchaser / vendor / both), and contact (email or phone).

## Property
One sentence with the address and any other key details (price range, type of agency, etc.).

## Key findings
2 to 5 bullets. Each bullet states a fact and why it matters. Call out anything answered "yes" on a disclosure question — those are material and must be resolved before listing. If nothing notable, write a single bullet: "No material disclosures identified."

## Risk
One line. Start with one of: Low risk. Medium risk. High risk. Then a half-sentence explanation.

## Next steps
1 to 4 numbered actions, in priority order, each starting with a verb. If none, write: "No actions required — proceed to listing."

## Signatures
One sentence: who signed and when, and whether any required signatures are missing.`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return {
        summary: `AI Summary generation failed (${response.status}). Please try regenerating.`,
        generated: false
      };
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || 'No summary generated.';
    return { summary: stripDecorative(raw), generated: true };
  } catch (err) {
    console.error('AI summary error:', err);
    return {
      summary: 'AI Summary generation failed. Please check your API key and try again.',
      generated: false
    };
  }
}

module.exports = { generateSummary };
