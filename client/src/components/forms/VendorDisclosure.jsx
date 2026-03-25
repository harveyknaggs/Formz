import { useState } from 'react';
import SignaturePad from '../SignaturePad';

const DISCLOSURE_QUESTIONS = [
  { key: 'structuralIssues', label: 'Are you aware of any structural issues, defects, or damage to the property?' },
  { key: 'weathertightness', label: 'Are you aware of any weathertightness issues (leaks, moisture, mould)?' },
  { key: 'asbestos', label: 'Are you aware of any asbestos, lead paint, or other hazardous materials?' },
  { key: 'methContamination', label: 'Has the property been tested for or found to contain methamphetamine contamination?' },
  { key: 'titleBoundary', label: 'Are you aware of any disputes or issues regarding the title or boundaries?' },
  { key: 'easements', label: 'Are there any easements, covenants, or encumbrances on the property?' },
  { key: 'councilNotices', label: 'Are you aware of any outstanding council notices, orders, or requisitions?' },
  { key: 'insurance', label: 'Have you had any insurance claims declined or are aware of any unresolved issues?' },
  { key: 'flooding', label: 'Is the property subject to flooding, erosion, or natural hazards?' },
  { key: 'gst', label: 'Is the sale subject to GST?' },
  { key: 'bodyCorporate', label: 'Is the property part of a Body Corporate or unit title?' },
  { key: 'tenanted', label: 'Is the property currently tenanted?' },
];

export default function VendorDisclosure({ data, onChange, readOnly }) {
  const [form, setForm] = useState(data || {
    disclosures: Object.fromEntries(DISCLOSURE_QUESTIONS.map(q => [q.key, { answer: '', details: '' }])),
    additionalDisclosures: '',
    vendorSignature1: null,
    vendorSignature2: null,
  });

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  const updateDisclosure = (key, field, value) => {
    const disclosures = { ...form.disclosures, [key]: { ...form.disclosures[key], [field]: value } };
    update('disclosures', disclosures);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-navy">Vendor Disclosure Statement</h2>
        <p className="text-sm text-slate-500">Please answer each question honestly. Provide details for any "Yes" answers.</p>
      </div>

      <div className="space-y-4">
        {DISCLOSURE_QUESTIONS.map(q => (
          <div key={q.key} className="p-4 border border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-800 mb-2">{q.label}</p>
            <div className="flex gap-4 mb-2">
              {['Yes', 'No', 'Unknown'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={q.key}
                    value={opt}
                    checked={form.disclosures[q.key]?.answer === opt}
                    onChange={e => updateDisclosure(q.key, 'answer', e.target.value)}
                    disabled={readOnly}
                    className="text-primary"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
            {form.disclosures[q.key]?.answer === 'Yes' && (
              <textarea
                className="input h-16 mt-2"
                placeholder="Please provide details..."
                value={form.disclosures[q.key]?.details || ''}
                onChange={e => updateDisclosure(q.key, 'details', e.target.value)}
                disabled={readOnly}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="label">Additional Disclosures</label>
        <textarea className="input h-24" value={form.additionalDisclosures} onChange={e => update('additionalDisclosures', e.target.value)} disabled={readOnly} placeholder="Any other information the purchaser should be aware of..." />
      </div>

      {!readOnly && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Vendor Signatures</h3>
          <SignaturePad label="Vendor 1 Signature" value={form.vendorSignature1} onChange={v => update('vendorSignature1', v)} required />
          <SignaturePad label="Vendor 2 Signature" value={form.vendorSignature2} onChange={v => update('vendorSignature2', v)} />
        </div>
      )}

      {readOnly && form.vendorSignature1?.dataUrl && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Vendor Signatures</h3>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Vendor 1</p>
            <img src={form.vendorSignature1.dataUrl} alt="Signature" className="border rounded-lg max-h-24" />
            <p className="text-xs text-slate-400 mt-1">Signed: {new Date(form.vendorSignature1.timestamp).toLocaleString('en-NZ')}</p>
          </div>
          {form.vendorSignature2?.dataUrl && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Vendor 2</p>
              <img src={form.vendorSignature2.dataUrl} alt="Signature" className="border rounded-lg max-h-24" />
              <p className="text-xs text-slate-400 mt-1">Signed: {new Date(form.vendorSignature2.timestamp).toLocaleString('en-NZ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
