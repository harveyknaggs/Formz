import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VENDOR_FORMS = [
  { value: 'market_appraisal', label: 'Market Appraisal' },
  { value: 'vendor_disclosure', label: 'Vendor Disclosure' },
  { value: 'agency_agreement', label: 'Agency Agreement' },
];

const BUYER_FORMS = [
  { value: 'purchaser_acknowledgement', label: 'Purchaser Acknowledgement' },
  { value: 'sale_purchase_agreement', label: 'Sale & Purchase Agreement' },
];

export default function ClientDetail() {
  const { id } = useParams();
  const { api } = useAuth();
  const [client, setClient] = useState(null);
  const [showSend, setShowSend] = useState(false);
  const [category, setCategory] = useState('vendor');
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const load = () => api(`/api/clients/${id}`).then(setClient).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase'
  }[t] || t);

  const handleSend = async () => {
    if (!selected.length) return alert('Select at least one form');
    setSending(true);
    try {
      await api('/api/forms/send', {
        method: 'POST',
        body: JSON.stringify({ client_id: parseInt(id), form_category: category, form_types: selected })
      });
      setShowSend(false);
      setSelected([]);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const toggle = (v) => setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  if (!client) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const forms = category === 'vendor' ? VENDOR_FORMS : BUYER_FORMS;

  return (
    <div>
      <Link to="/clients" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Clients</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500">{client.email} {client.phone && `· ${client.phone}`}</p>
        </div>
        <button onClick={() => setShowSend(true)} className="btn-primary">Send Forms</button>
      </div>

      {/* Send Forms Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSend(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Send Forms to {client.name}</h2>

            <div className="flex gap-2 mb-4">
              <button onClick={() => { setCategory('vendor'); setSelected([]); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${category === 'vendor' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}>
                Vendor Forms
              </button>
              <button onClick={() => { setCategory('buyer'); setSelected([]); }} className={`px-4 py-2 rounded-lg text-sm font-medium ${category === 'buyer' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}>
                Buyer Forms
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {forms.map(f => (
                <label key={f.value} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(f.value)} onChange={() => toggle(f.value)} className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{f.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSend(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSend} disabled={sending || !selected.length} className="btn-primary">
                {sending ? 'Sending...' : `Send ${selected.length} Form${selected.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form History */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Form History</h2>
        {!client.forms?.length ? (
          <p className="text-slate-400 text-center py-8">No forms sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Form</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Category</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Sent</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Submitted</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500"></th>
                </tr>
              </thead>
              <tbody>
                {client.forms.map(f => (
                  <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">{formLabel(f.form_type)}</td>
                    <td className="py-3 px-2 text-slate-600 capitalize">{f.form_category}</td>
                    <td className="py-3 px-2">
                      <span className={`badge-${f.submission_status || f.status}`}>{f.submission_status || f.status}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-500">{new Date(f.created_at).toLocaleDateString('en-NZ')}</td>
                    <td className="py-3 px-2 text-slate-500">{f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-NZ') : '—'}</td>
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
