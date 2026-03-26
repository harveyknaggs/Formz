import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FormsSent() {
  const { api } = useAuth();
  const [forms, setForms] = useState([]);

  useEffect(() => { api('/api/forms/sent').then(setForms).catch(console.error); }, []);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase', vendor_forms: 'Vendor Forms',
    buyer_forms: 'Buyer Forms'
  }[t] || t);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Forms Sent</h1>
        <p className="text-slate-500 mt-1">{forms.length} form{forms.length !== 1 ? 's' : ''} sent</p>
      </div>

      <div className="card">
        {forms.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No forms sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Client</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Form</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Sent</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Expires</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {forms.map(f => (
                  <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">{f.client_name}</td>
                    <td className="py-3 px-2 text-slate-600">{formLabel(f.form_type)}</td>
                    <td className="py-3 px-2 text-slate-600 capitalize">{f.form_category}</td>
                    <td className="py-3 px-2">
                      <span className={`badge-${f.submission_status || f.status}`}>{f.submission_status || f.status}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-500">{new Date(f.created_at).toLocaleDateString('en-NZ')}</td>
                    <td className="py-3 px-2 text-slate-500">{new Date(f.expires_at).toLocaleDateString('en-NZ')}</td>
                    <td className="py-3 px-2">
                      {f.submission_id && (
                        <Link to={`/submissions/${f.submission_id}`} className="text-primary text-sm hover:underline">Review</Link>
                      )}
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
