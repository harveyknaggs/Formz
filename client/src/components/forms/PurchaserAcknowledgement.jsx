import { useState } from 'react';
import SignaturePad from '../SignaturePad';

const ACKNOWLEDGEMENT_POINTS = [
  'I/we acknowledge that the licensee has disclosed to me/us the nature and extent of all duties, obligations, and interests the licensee has.',
  'I/we acknowledge that the licensee has explained the agency agreement, and I/we understand the implications.',
  'I/we understand that any information provided by the licensee is not to be taken as legal, financial, or other professional advice.',
  'I/we acknowledge that the licensee has recommended that I/we obtain independent legal advice before signing any agreement.',
  'I/we understand that any price indications given are the licensee\'s opinion of market value and not a formal valuation.',
  'I/we acknowledge that the licensee has provided a copy of the New Zealand Residential Property Agency Agreement Guide.',
  'I/we understand the implications of the Official Information Act as it relates to local authority information and property files.',
];

export default function PurchaserAcknowledgement({ data, onChange, readOnly }) {
  const [form, setForm] = useState(data || {
    propertyAddress: '',
    purchaserName1: '',
    purchaserName2: '',
    purchaserAddress: '',
    purchaserPhone: '',
    purchaserEmail: '',
    solicitorName: '',
    solicitorFirm: '',
    solicitorPhone: '',
    solicitorEmail: '',
    relationshipDisclosure: '',
    relationshipDetails: '',
    oralDisclosures: '',
    purchaserSignature1: null,
    purchaserSignature2: null,
    witnessSignature1: null,
    witnessSignature2: null,
  });

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-navy">Purchaser Acknowledgement</h2>
        <p className="text-sm text-slate-500">Buyer acknowledgement form</p>
      </div>

      {/* Property & Purchaser */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Property Address *</label>
          <input className="input" value={form.propertyAddress} onChange={e => update('propertyAddress', e.target.value)} disabled={readOnly} required />
        </div>
        <div>
          <label className="label">Purchaser 1 Full Name *</label>
          <input className="input" value={form.purchaserName1} onChange={e => update('purchaserName1', e.target.value)} disabled={readOnly} required />
        </div>
        <div>
          <label className="label">Purchaser 2 Full Name</label>
          <input className="input" value={form.purchaserName2} onChange={e => update('purchaserName2', e.target.value)} disabled={readOnly} />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.purchaserAddress} onChange={e => update('purchaserAddress', e.target.value)} disabled={readOnly} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.purchaserPhone} onChange={e => update('purchaserPhone', e.target.value)} disabled={readOnly} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.purchaserEmail} onChange={e => update('purchaserEmail', e.target.value)} disabled={readOnly} />
        </div>
      </div>

      {/* Solicitor */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Purchaser's Solicitor</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Solicitor Name</label>
            <input className="input" value={form.solicitorName} onChange={e => update('solicitorName', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Firm</label>
            <input className="input" value={form.solicitorFirm} onChange={e => update('solicitorFirm', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.solicitorPhone} onChange={e => update('solicitorPhone', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.solicitorEmail} onChange={e => update('solicitorEmail', e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </div>

      {/* Acknowledgement Points (read-only display) */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="font-semibold text-navy mb-3">Acknowledgement Points</h3>
        <ol className="space-y-3">
          {ACKNOWLEDGEMENT_POINTS.map((point, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span>{point}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Relationship Disclosure */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Relationship Disclosure</h3>
        <p className="text-sm text-slate-600 mb-3">Does the licensee have any relationship with the vendor or any other party involved in this transaction?</p>
        <div className="flex gap-4 mb-3">
          {['Yes', 'No', 'Not sure'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="relationshipDisclosure"
                value={opt}
                checked={form.relationshipDisclosure === opt}
                onChange={e => update('relationshipDisclosure', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
        {form.relationshipDisclosure === 'Yes' && (
          <textarea className="input h-16" placeholder="Please provide details..." value={form.relationshipDetails} onChange={e => update('relationshipDetails', e.target.value)} disabled={readOnly} />
        )}
      </div>

      {/* Oral Disclosures */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Oral Disclosures</h3>
        <p className="text-sm text-slate-600 mb-2">Record any oral disclosures made by the licensee during this transaction:</p>
        <textarea className="input h-24" value={form.oralDisclosures} onChange={e => update('oralDisclosures', e.target.value)} disabled={readOnly} placeholder="Details of any verbal disclosures..." />
      </div>

      {/* OIA / Auctions / CDD Info (read-only) */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
        <div>
          <h4 className="font-semibold text-navy text-sm">Official Information Act (OIA)</h4>
          <p className="text-xs text-slate-600 mt-1">Information held by local authorities about a property is available under the OIA. You are advised to make enquiries with the relevant local authority regarding any matters that may affect the property.</p>
        </div>
        <div>
          <h4 className="font-semibold text-navy text-sm">Auctions</h4>
          <p className="text-xs text-slate-600 mt-1">If purchasing at auction, the sale is unconditional upon the fall of the hammer. You should arrange finance, obtain a LIM report, and complete all due diligence before auction day.</p>
        </div>
        <div>
          <h4 className="font-semibold text-navy text-sm">Customer Due Diligence (CDD)</h4>
          <p className="text-xs text-slate-600 mt-1">Under the Anti-Money Laundering and Countering Financing of Terrorism Act 2009, the real estate agency is required to conduct customer due diligence. You may be asked to provide identification and verify the source of funds.</p>
        </div>
      </div>

      {/* Signatures */}
      {!readOnly && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Signatures</h3>
          <SignaturePad label="Purchaser 1 Signature" value={form.purchaserSignature1} onChange={v => update('purchaserSignature1', v)} required />
          <SignaturePad label="Purchaser 2 Signature" value={form.purchaserSignature2} onChange={v => update('purchaserSignature2', v)} />
          <SignaturePad label="Witness 1 Signature" value={form.witnessSignature1} onChange={v => update('witnessSignature1', v)} required />
          <SignaturePad label="Witness 2 Signature" value={form.witnessSignature2} onChange={v => update('witnessSignature2', v)} />
        </div>
      )}

      {readOnly && form.purchaserSignature1?.dataUrl && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Signatures</h3>
          {[
            { key: 'purchaserSignature1', label: 'Purchaser 1' },
            { key: 'purchaserSignature2', label: 'Purchaser 2' },
            { key: 'witnessSignature1', label: 'Witness 1' },
            { key: 'witnessSignature2', label: 'Witness 2' },
          ].filter(s => form[s.key]?.dataUrl).map(s => (
            <div key={s.key}>
              <p className="text-sm font-medium text-slate-700 mb-1">{s.label}</p>
              <img src={form[s.key].dataUrl} alt={`${s.label} Signature`} className="border rounded-lg max-h-24" />
              <p className="text-xs text-slate-400 mt-1">Signed: {new Date(form[s.key].timestamp).toLocaleString('en-NZ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
