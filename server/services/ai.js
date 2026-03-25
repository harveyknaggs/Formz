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
    sale_purchase_agreement: 'Sale & Purchase Agreement'
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
          content: `You are an expert New Zealand real estate assistant working for Hometown Real Estate (@realty). Analyse this completed ${categoryLabel} ${formLabel} form and provide a structured summary for the listing agent.

Form data:
${JSON.stringify(formData, null, 2)}

Provide a clear, professional summary with these sections:
1. **Client Overview** — Name, contact details, role (vendor/buyer)
2. **Property Details** — Address, type, key features mentioned
3. **Key Disclosures** — Flag anything marked "Yes" that needs attention (structural issues, toxicology, boundary disputes, etc.)
4. **Red Flags** — Anything unusual, inconsistent, or requiring immediate attention
5. **Recommended Next Steps** — Specific actions the agent should take
6. **Overall Assessment** — One of: ✅ Ready to Proceed | ⚠️ Needs Attention | 🔴 Action Required

Be concise but thorough. Focus on what matters for the agent's next actions. Use NZ real estate terminology where appropriate.`
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
