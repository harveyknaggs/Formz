// Maps the flat form_data keys (which are the visible <label> text from the HTML
// in server/public/forms/{buyer,vendor}_forms.html) into the sub-forms they belong to.
// REA labels are stable so a static map is fine; if HTML labels change, update here.
// Match is case-insensitive.

export const BUYER_SECTIONS = [
  {
    id: 'acknowledgement',
    title: 'Purchaser Acknowledgement',
    description: 'Buyer details, disclosures and signatures.',
    art: 'scribble',
    referenceOnly: false,
    fields: [
      'Property Located At',
      'Purchaser Name(s)',
      'Phone',
      'Email',
      'Solicitor (if known)',
      'Solicitor Firm',
      'Full Name',
      'Relationship Disclosure / Related to Party Transaction (s.134 and/or 136 Real Estate Agents Act 2008)',
      'Oral or Written Disclosures'
    ],
    signatures: ['purchaser']
  },
  {
    id: 'spa',
    title: 'Sale & Purchase Agreement',
    description: 'Standard ADLS / REINZ template — for reference.',
    art: 'stack',
    referenceOnly: true,
    fields: [],
    signatures: []
  },
  {
    id: 'guide',
    title: "Buyer's Journey Guide",
    description: 'Five-stage walkthrough — for reference.',
    art: 'rows',
    referenceOnly: true,
    fields: [],
    signatures: []
  }
];

export const VENDOR_SECTIONS = [
  {
    id: 'appraisal',
    title: 'Market Appraisal',
    description: 'Appraised market value range and vendor confirmation.',
    art: 'rows',
    referenceOnly: false,
    fields: [
      'Address of Property',
      'From $',
      'To $',
      'Full Name'
    ],
    signatures: ['vendor']
  },
  {
    id: 'disclosure',
    title: 'Vendor Disclosure',
    description: 'Property condition, title, GST and other vendor disclosures.',
    art: 'scribble',
    referenceOnly: false,
    fields: [
      'Property Address',
      'Vendor Name(s)',
      'Date',
      'Are you aware of any leaks, structural problems, or construction issues?',
      'If yes, provide details',
      'Has the property been contaminated by drug manufacture or use (toxicology)?',
      'Are you aware of any fencing disputes, boundary issues, title complications or requisitions?',
      'Have all body corporate / cross lease matters been disclosed?',
      'Are all structures shown on the deposited plan with required consents obtained?',
      'Have you fully advised your agent of all matters that may affect GST?',
      'Client GST Registered?',
      'Any other matters a prospective purchaser should be aware of?',
      'Full Name'
    ],
    signatures: ['vendor']
  },
  {
    id: 'agency',
    title: 'Agency Agreement',
    description: 'Listing terms, commission, property details and signatures.',
    art: 'stack',
    referenceOnly: false,
    fields: [
      'Property Address',
      'Registered Owner(s)',
      'Company / Trust (if applicable)',
      'Owner Mobile',
      'Owner Email',
      'Postal Address',
      'Reason for Selling',
      'Agency Type',
      'Commencement Date',
      'Expiry Date',
      'Listing Price $',
      'GST',
      'Appraised Range $ (From)',
      'Appraised Range $ (To)',
      'Preferred Settlement Date',
      'Marketing Investment $ (incl. GST)',
      'Signage',
      'Approx. Year Built',
      'Land Area (m²)',
      'Total Bedrooms',
      'Total Bathrooms',
      'Total Garages',
      'Chattels Included',
      'Fixtures / Chattels Excluded',
      'Solicitor Name',
      'Firm',
      'Solicitor Phone',
      'Solicitor Email',
      "Agent's rebates, discounts or other commissions",
      'If rebates apply — specify details',
      'Is the vendor aware of any leaks, structural problems or issues?',
      'Toxicology — Is vendor aware of any drug contamination?',
      'Salesperson Name',
      'Licence No.',
      'Full Name'
    ],
    signatures: ['client', 'authorised person', 'salesperson']
  }
];

export function getSectionsFor(formCategory) {
  return formCategory === 'vendor' ? VENDOR_SECTIONS : BUYER_SECTIONS;
}

// Return entries from the flat formData object that belong to this section.
// Match is case-insensitive on the key.
export function fieldsForSection(formData, section) {
  if (!formData || !section) return [];
  const wanted = new Set(section.fields.map(s => s.toLowerCase()));
  return Object.entries(formData)
    .filter(([key]) => !key.startsWith('sig_') && !key.startsWith('name_') && !key.startsWith('ts_'))
    .filter(([key]) => wanted.has(key.toLowerCase()));
}

// Keys that aren't claimed by any section (legacy / unknown labels).
// Shown under the first section so nothing is lost.
export function orphanFields(formData, sections) {
  if (!formData) return [];
  const claimed = new Set();
  for (const s of sections) for (const f of s.fields) claimed.add(f.toLowerCase());
  return Object.entries(formData)
    .filter(([key]) => !key.startsWith('sig_') && !key.startsWith('name_') && !key.startsWith('ts_'))
    .filter(([key]) => !claimed.has(key.toLowerCase()));
}

// Filter signatures rows to those whose signer_name or signer_role matches
// any of the section's signature keywords (case-insensitive substring).
export function signaturesForSection(signatures, section) {
  if (!signatures || !section?.signatures?.length) return [];
  const keywords = section.signatures.map(k => k.toLowerCase());
  return signatures.filter(s => {
    const name = (s.signer_name || '').toLowerCase();
    const role = (s.signer_role || '').toLowerCase();
    return keywords.some(k => name.includes(k) || role.includes(k));
  });
}
