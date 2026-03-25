import { useState } from 'react';
import SignaturePad from '../SignaturePad';

const CHATTELS = [
  'Fixed floor coverings', 'Blinds', 'Curtains', 'Light fittings', 'Stove/Oven',
  'Dishwasher', 'Rangehood', 'Waste disposal', 'Clothesline', 'Garden shed',
  'Heat pump(s)', 'Smoke alarms', 'Garage door opener(s)', 'Satellite dish',
  'TV aerial', 'Heated towel rail(s)', 'Spa pool', 'Pool equipment',
];

export default function AgencyAgreement({ data, onChange, readOnly }) {
  const [form, setForm] = useState(data || {
    propertyAddress: '',
    legalDescription: '',
    certificateOfTitle: '',
    propertyType: '',
    landArea: '',
    floorArea: '',
    agencyType: 'sole',
    agencyPeriodFrom: '',
    agencyPeriodTo: '',
    listingPrice: '',
    reservePrice: '',
    marketingBudget: '',
    chattels: [],
    commissionRate: '',
    commissionMinimum: '',
    gstInclusive: 'inclusive',
    solicitorName: '',
    solicitorFirm: '',
    solicitorPhone: '',
    solicitorEmail: '',
    vendorName1: '',
    vendorName2: '',
    vendorAddress: '',
    vendorPhone: '',
    vendorEmail: '',
    disclosureAcknowledged: false,
    termsAcknowledged: false,
    vendorSignature1: null,
    vendorSignature2: null,
    agentSignature: null,
  });

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  const toggleChattel = (item) => {
    const next = form.chattels.includes(item)
      ? form.chattels.filter(c => c !== item)
      : [...form.chattels, item];
    update('chattels', next);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-navy">Agency Agreement</h2>
        <p className="text-sm text-slate-500">Listing agreement between vendor and Hometown Real Estate (@realty)</p>
      </div>

      {/* Property Details */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Property Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Property Address *</label>
            <input className="input" value={form.propertyAddress} onChange={e => update('propertyAddress', e.target.value)} disabled={readOnly} required />
          </div>
          <div>
            <label className="label">Legal Description</label>
            <input className="input" value={form.legalDescription} onChange={e => update('legalDescription', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Certificate of Title</label>
            <input className="input" value={form.certificateOfTitle} onChange={e => update('certificateOfTitle', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Property Type</label>
            <select className="input" value={form.propertyType} onChange={e => update('propertyType', e.target.value)} disabled={readOnly}>
              <option value="">Select...</option>
              <option>Residential</option>
              <option>Lifestyle</option>
              <option>Rural</option>
              <option>Commercial</option>
              <option>Industrial</option>
            </select>
          </div>
          <div>
            <label className="label">Land Area (m²)</label>
            <input className="input" value={form.landArea} onChange={e => update('landArea', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Floor Area (m²)</label>
            <input className="input" value={form.floorArea} onChange={e => update('floorArea', e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </div>

      {/* Agency Type & Pricing */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Agency Terms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Agency Type *</label>
            <select className="input" value={form.agencyType} onChange={e => update('agencyType', e.target.value)} disabled={readOnly}>
              <option value="sole">Sole Agency</option>
              <option value="general">General Agency</option>
              <option value="auction">Auction</option>
              <option value="tender">Tender</option>
            </select>
          </div>
          <div>
            <label className="label">Listing Price (NZD)</label>
            <input className="input" value={form.listingPrice} onChange={e => update('listingPrice', e.target.value)} disabled={readOnly} placeholder="$" />
          </div>
          <div>
            <label className="label">Agency Period From</label>
            <input type="date" className="input" value={form.agencyPeriodFrom} onChange={e => update('agencyPeriodFrom', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Agency Period To</label>
            <input type="date" className="input" value={form.agencyPeriodTo} onChange={e => update('agencyPeriodTo', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Reserve Price (if auction/tender)</label>
            <input className="input" value={form.reservePrice} onChange={e => update('reservePrice', e.target.value)} disabled={readOnly} placeholder="$" />
          </div>
          <div>
            <label className="label">Marketing Budget (NZD)</label>
            <input className="input" value={form.marketingBudget} onChange={e => update('marketingBudget', e.target.value)} disabled={readOnly} placeholder="$" />
          </div>
        </div>
      </div>

      {/* Chattels */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Chattels Included in Sale</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CHATTELS.map(item => (
            <label key={item} className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.chattels.includes(item)}
                onChange={() => toggleChattel(item)}
                disabled={readOnly}
                className="text-primary"
              />
              {item}
            </label>
          ))}
        </div>
      </div>

      {/* Commission */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Commission</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Commission Rate (%)</label>
            <input className="input" value={form.commissionRate} onChange={e => update('commissionRate', e.target.value)} disabled={readOnly} placeholder="e.g. 3.95" />
          </div>
          <div>
            <label className="label">Minimum Commission (NZD)</label>
            <input className="input" value={form.commissionMinimum} onChange={e => update('commissionMinimum', e.target.value)} disabled={readOnly} placeholder="$" />
          </div>
          <div>
            <label className="label">GST</label>
            <select className="input" value={form.gstInclusive} onChange={e => update('gstInclusive', e.target.value)} disabled={readOnly}>
              <option value="inclusive">GST Inclusive</option>
              <option value="exclusive">GST Exclusive</option>
              <option value="plus">Plus GST</option>
            </select>
          </div>
        </div>
      </div>

      {/* Solicitor */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Vendor's Solicitor</h3>
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

      {/* Vendor Details */}
      <div>
        <h3 className="font-semibold text-navy mb-3">Vendor Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Vendor 1 Full Name *</label>
            <input className="input" value={form.vendorName1} onChange={e => update('vendorName1', e.target.value)} disabled={readOnly} required />
          </div>
          <div>
            <label className="label">Vendor 2 Full Name</label>
            <input className="input" value={form.vendorName2} onChange={e => update('vendorName2', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.vendorAddress} onChange={e => update('vendorAddress', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.vendorPhone} onChange={e => update('vendorPhone', e.target.value)} disabled={readOnly} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.vendorEmail} onChange={e => update('vendorEmail', e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </div>

      {/* Acknowledgements */}
      {!readOnly && (
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Acknowledgements</h3>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.disclosureAcknowledged} onChange={e => update('disclosureAcknowledged', e.target.checked)} className="mt-1 text-primary" />
            <span className="text-sm text-slate-700">I acknowledge that I have read and completed a Vendor Disclosure Statement and provided accurate information.</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.termsAcknowledged} onChange={e => update('termsAcknowledged', e.target.checked)} className="mt-1 text-primary" />
            <span className="text-sm text-slate-700">I acknowledge that I have read and agree to the terms and conditions of this Agency Agreement including the commission structure outlined above.</span>
          </label>
        </div>
      )}

      {/* Signatures */}
      {!readOnly && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Signatures</h3>
          <SignaturePad label="Vendor 1 Signature" value={form.vendorSignature1} onChange={v => update('vendorSignature1', v)} required />
          <SignaturePad label="Vendor 2 Signature" value={form.vendorSignature2} onChange={v => update('vendorSignature2', v)} />
          <SignaturePad label="Agent Signature" value={form.agentSignature} onChange={v => update('agentSignature', v)} />
        </div>
      )}

      {readOnly && form.vendorSignature1?.dataUrl && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-navy">Signatures</h3>
          {[
            { key: 'vendorSignature1', label: 'Vendor 1' },
            { key: 'vendorSignature2', label: 'Vendor 2' },
            { key: 'agentSignature', label: 'Agent' },
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
