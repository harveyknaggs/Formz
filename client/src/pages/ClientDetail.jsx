import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ClientDetail() {
  const { id } = useParams();
  const { api } = useAuth();
  const [client, setClient] = useState(null);
  const [showSend, setShowSend] = useState(false);
  const [category, setCategory] = useState('vendor');
  const [sending, setSending] = useState(false);
  const [sentLink, setSentLink] = useState('');

  const load = () => api(`/api/clients/${id}`).then(setClient).catch(console.error);
  useEffect(() => { load(); }, [id]);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase', vendor_forms: 'Vendor Forms',
    buyer_forms: 'Buyer Forms'
  }[t] || t);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await api('/api/forms/send', {
        method: 'POST',
        body: JSON.stringify({ client_id: parseInt(id), form_category: category })
      });
      setSentLink(result.link || '');
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!client) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div>
      <Link to="/clients" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Clients</Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500">{client.email} {client.phone && `· ${client.phone}`}</p>
        </div>
        <button onClick={() => { setShowSend(true); setSentLink(''); }} className="btn-primary">Send Forms</button>
      </div>

      {/* Send Forms Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSend(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            {sentLink ? (
              <>
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-lg font-semibold mb-2">Forms Sent!</h2>
                  <p className="text-slate-500 text-sm mb-4">An email with the form link has been sent to {client.name}.</p>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm break-all text-slate-600">
                    {sentLink}
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button onClick={() => setShowSend(false)} className="btn-primary">Done</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-2">Send Forms to {client.name}</h2>
                <p className="text-sm text-slate-500 mb-4">Choose the form pack to send. The client will receive a single link with all tabs.</p>

                <div className="space-y-3 mb-6">
                  <label
                    onClick={() => setCategory('vendor')}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === 'vendor' ? 'border-[#0099cc] bg-[#0099cc]/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" checked={category === 'vendor'} onChange={() => setCategory('vendor')} className="w-4 h-4 text-[#0099cc]" />
                    <div>
                      <div className="font-semibold text-slate-900">Vendor Forms</div>
                      <div className="text-xs text-slate-500 mt-0.5">Market Appraisal · Vendor Disclosure · Agency Agreement · Seller's Guide</div>
                    </div>
                  </label>
                  <label
                    onClick={() => setCategory('buyer')}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      category === 'buyer' ? 'border-[#003087] bg-[#003087]/5' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" checked={category === 'buyer'} onChange={() => setCategory('buyer')} className="w-4 h-4 text-[#003087]" />
                    <div>
                      <div className="font-semibold text-slate-900">Buyer Forms</div>
                      <div className="text-xs text-slate-500 mt-0.5">Purchaser Acknowledgement · Sale & Purchase Agreement · Buyer's Guide</div>
                    </div>
                  </label>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowSend(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleSend} disabled={sending} className="btn-primary">
                    {sending ? 'Sending...' : `Send ${category === 'vendor' ? 'Vendor' : 'Buyer'} Forms`}
                  </button>
                </div>
              </>
            )}
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
