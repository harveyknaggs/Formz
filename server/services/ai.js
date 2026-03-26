async function generateSummary(formData, formType, formCategory) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    return {
      summary: '⚠️ AI Summary unavailable — ANTHROPIC_API_KEY not configured.\n\nTo enable AI summaries, add your Anthropic API key to the .env file.',
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
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a senior NZ real estate compliance analyst. Review this completed ${categoryLabel} ${formLabel} and produce a concise executive briefing for the listing agent.

Form data:
${JSON.stringify(formData, null, 2)}

Write a professional briefing using this exact format. Be direct, factual, and actionable. No filler. Every sentence must add value.

## Client
- Name, contact, and role in one line

## Property
- Address and any details provided

## Key Findings
Bullet each significant disclosure or data point. For each, state the fact and its implication. Flag anything marked "Yes" on disclosure questions — these are material and must be addressed before listing. If nothing was flagged, state "No material disclosures identified."

## Risk Assessment
State one of:
- **LOW RISK** — All disclosures clear, standard transaction
- **MEDIUM RISK** — Minor items require follow-up before proceeding
- **HIGH RISK** — Material issues identified, do not proceed without resolution

Then explain why in 1-2 sentences.

## Required Actions
Numbered list of specific next steps the agent must take, in priority order. Be precise — "Obtain LIM report from [council]" not "Check council records." If no actions needed, state "No immediate actions required — proceed to listing."

## Signatures
Confirm who signed, timestamps, and flag if any required signatures are missing.

Keep the entire summary under 300 words. Write for a busy professional who needs to act on this immediately.`
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return {
        summary: `⚠️ AI Summary generation failed (${response.status}). Please try regenerating.`,
        generated: false
      };
    }

    const data = await response.json();
    const summaryText = data.content?.[0]?.text || 'No summary generated.';

    return { summary: summaryText, generated: true };
  } catch (err) {
    console.error('AI summary error:', err);
    return {
      summary: '⚠️ AI Summary generation failed. Please check your API key and try again.',
      generated: false
    };
  }
}

module.exports = { generateSummary };
