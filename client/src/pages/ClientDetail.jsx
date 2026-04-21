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
          <div className={`card w-full ${sentLink ? 'max-w-md' : 'max-w-3xl'}`} onClick={e => e.stopPropagation()}>
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
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 font-medium">
                    <span className="w-6 h-px bg-slate-300" />
                    Send to {client.name}
                    <span className="w-6 h-px bg-slate-300" />
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900 mt-3 mb-2">Which <span className="text-primary italic">form pack</span> fits this job?</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">One link, every form in the pack. Hover a card to preview, click to select.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Vendor card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setCategory('vendor')}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setCategory('vendor')}
                    className={`pick-card vendor ${category === 'vendor' ? 'is-selected' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="pick-num">01</span>
                      <span className="pick-tag"><span className="pip" />3 forms · ~10 min</span>
                    </div>
                    <div className="pick-art">
                      <div className="art-rows">
                        <div className="r r1" />
                        <div className="r r2" />
                        <div className="r r3" />
                        <div className="r r4" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-navy leading-snug mb-1">Vendor pack</h3>
                    <p className="text-sm text-slate-500 leading-snug mb-3">Market appraisal, vendor disclosure & agency agreement — everything to list a property.</p>
                    <div className="pick-foot">
                      <span className="meta"><b>3</b> forms</span>
                      <span className="cta">
                        {category === 'vendor' ? 'Selected' : 'Choose'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </div>

                  {/* Buyer card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setCategory('buyer')}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setCategory('buyer')}
                    className={`pick-card buyer ${category === 'buyer' ? 'is-selected' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="pick-num">02</span>
                      <span className="pick-tag"><span className="pip" />1 form · ~3 min</span>
                    </div>
                    <div className="pick-art">
                      <div className="art-sign">
                        <div className="pad" />
                        <svg className="scribble" viewBox="0 0 130 30" preserveAspectRatio="none">
                          <path d="M2 22 C 12 8, 22 30, 32 14 S 52 22, 62 12 S 82 26, 92 16 S 112 10, 124 18" />
                        </svg>
                        <div className="check">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-navy leading-snug mb-1">Buyer pack</h3>
                    <p className="text-sm text-slate-500 leading-snug mb-3">Purchaser acknowledgement — confirms they understand the property they're offering on.</p>
                    <div className="pick-foot">
                      <span className="meta"><b>1</b> form</span>
                      <span className="cta">
                        {category === 'buyer' ? 'Selected' : 'Choose'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowSend(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleSend} disabled={sending} className="btn-primary">
                    {sending ? 'Sending...' : `Send ${category === 'vendor' ? 'Vendor' : 'Buyer'} pack`}
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
