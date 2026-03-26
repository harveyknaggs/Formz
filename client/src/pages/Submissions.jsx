import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Submissions() {
  const { api } = useAuth();
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState({ form_type: '', status: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (filter.form_type) params.set('form_type', filter.form_type);
    if (filter.status) params.set('status', filter.status);
    api(`/api/submissions?${params}`).then(setSubs).catch(console.error);
  };

  useEffect(() => { load(); }, [filter]);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase', vendor_forms: 'Vendor Forms',
    buyer_forms: 'Buyer Forms'
  }[t] || t);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
        <p className="text-slate-500 mt-1">{subs.length} submission{subs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input w-auto" value={filter.form_type} onChange={e => setFilter(f => ({ ...f, form_type: e.target.value }))}>
          <option value="">All Forms</option>
          <option value="vendor_forms">Vendor Forms</option>
          <option value="buyer_forms">Buyer Forms</option>
          <option value="market_appraisal">Market Appraisal</option>
          <option value="vendor_disclosure">Vendor Disclosure</option>
          <option value="agency_agreement">Agency Agreement</option>
          <option value="purchaser_acknowledgement">Purchaser Acknowledgement</option>
          <option value="sale_purchase_agreement">Sale & Purchase</option>
        </select>
        <select className="input w-auto" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      <div className="card">
        {subs.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No submissions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Client</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Form</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Submitted</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">{s.client_name}</td>
                    <td className="py-3 px-2 text-slate-600">{formLabel(s.form_type)}</td>
                    <td className="py-3 px-2 text-slate-600 capitalize">{s.form_category}</td>
                    <td className="py-3 px-2"><span className={`badge-${s.status}`}>{s.status}</span></td>
                    <td className="py-3 px-2 text-slate-500">{new Date(s.submitted_at).toLocaleDateString('en-NZ')}</td>
                    <td className="py-3 px-2">
                      <Link to={`/submissions/${s.id}`} className="btn-primary text-xs py-1 px-3">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
