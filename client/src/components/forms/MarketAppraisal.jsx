import { useState } from 'react';
import SignaturePad from '../SignaturePad';

export default function MarketAppraisal({ data, onChange, readOnly }) {
  const [form, setForm] = useState(data || {
    propertyAddress: '',
    propertyType: '',
    bedrooms: '',
    bathrooms: '',
    landArea: '',
    floorArea: '',
    yearBuilt: '',
    priceRangeFrom: '',
    priceRangeTo: '',
    marketComments: '',
    vendorSignature1: null,
    vendorSignature2: null,
  });

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-navy">Market Appraisal</h2>
        <p className="text-sm text-slate-500">Property valuation assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">Property Address *</label>
          <input className="input" value={form.propertyAddress} onChange={e => update('propertyAddress', e.target.value)} disabled={readOnly} required />
        </div>
        <div>
          <label className="label">Property Type</label>
          <select className="input" value={form.propertyType} onChange={e => update('propertyType', e.target.value)} disabled={readOnly}>
            <option value="">Select...</option>
            <option>House</option>
            <option>Apartment</option>
            <option>Townhouse</option>
            <option>Lifestyle Block</option>
            <option>Section/Land</option>
            <option>Commercial</option>
          </select>
        </div>
        <div>
          <label className="label">Year Built</label>
          <input className="input" value={form.yearBuilt} onChange={e => update('yearBuilt', e.target.value)} disabled={readOnly} />
        </div>
        <div>
          <label className="label">Bedrooms</label>
          <input type="number" className="input" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)} disabled={readOnly} />
        </div>
        <div>
          <label className="label">Bathrooms</label>
          <input type="number" className="input" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)} disabled={readOnly} />
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

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-navy mb-3">Estimated Price Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">From (NZD)</label>
            <input className="input" value={form.priceRangeFrom} onChange={e => update('priceRangeFrom', e.target.value)} placeholder="$" disabled={readOnly} />
          </div>
          <div>
            <label className="label">To (NZD)</label>
            <input className="input" value={form.priceRangeTo} onChange={e => update('priceRangeTo', e.target.value)} placeholder="$" disabled={readOnly} />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Market Comments</label>
        <textarea className="input h-24" value={form.marketComments} onChange={e => update('marketComments', e.target.value)} disabled={readOnly} placeholder="Additional observations about the property and current market conditions..." />
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
            <img src={form.vendorSignature1.dataUrl} alt="Vendor 1 Signature" className="border rounded-lg max-h-24" />
            <p className="text-xs text-slate-400 mt-1">Signed: {new Date(form.vendorSignature1.timestamp).toLocaleString('en-NZ')}</p>
          </div>
          {form.vendorSignature2?.dataUrl && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Vendor 2</p>
              <img src={form.vendorSignature2.dataUrl} alt="Vendor 2 Signature" className="border rounded-lg max-h-24" />
              <p className="text-xs text-slate-400 mt-1">Signed: {new Date(form.vendorSignature2.timestamp).toLocaleString('en-NZ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
