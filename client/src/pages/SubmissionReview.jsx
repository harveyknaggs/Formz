import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import MarketAppraisal from '../components/forms/MarketAppraisal';
import VendorDisclosure from '../components/forms/VendorDisclosure';
import AgencyAgreement from '../components/forms/AgencyAgreement';
import PurchaserAcknowledgement from '../components/forms/PurchaserAcknowledgement';
import SalePurchaseAgreement from '../components/forms/SalePurchaseAgreement';

const FORM_COMPONENTS = {
  market_appraisal: MarketAppraisal,
  vendor_disclosure: VendorDisclosure,
  agency_agreement: AgencyAgreement,
  purchaser_acknowledgement: PurchaserAcknowledgement,
  sale_purchase_agreement: SalePurchaseAgreement,
};

const FORM_LABELS = {
  market_appraisal: 'Market Appraisal',
  vendor_disclosure: 'Vendor Disclosure',
  agency_agreement: 'Agency Agreement',
  purchaser_acknowledgement: 'Purchaser Acknowledgement',
  sale_purchase_agreement: 'Sale & Purchase Agreement',
};

export default function SubmissionReview() {
  const { id } = useParams();
  const { api } = useAuth();
  const [sub, setSub] = useState(null);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/api/submissions/${id}`).then(data => {
      setSub(data);
      setNotes(data.agent_notes || '');
      setSummary(data.ai_summary || '');
      // Auto-generate summary if not present
      if (!data.ai_summary) generateSummary();
    }).catch(console.error);
  }, [id]);

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const result = await api(`/api/submissions/${id}/summary`, { method: 'POST' });
      setSummary(result.summary);
    } catch (err) {
      setSummary('Failed to generate summary: ' + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const markReviewed = async () => {
    setSaving(true);
    try {
      await api(`/api/submissions/${id}/review`, { method: 'PUT', body: JSON.stringify({ notes }) });
      setSub(prev => ({ ...prev, status: 'reviewed' }));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!sub) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const FormComponent = FORM_COMPONENTS[sub.form_type];
  // The form data might be stored under the form_type key or at the top level
  const displayData = sub.form_data[sub.form_type] || sub.form_data;

  return (
    <div>
      <Link to="/submissions" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Submissions</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sub.client_name} — {FORM_LABELS[sub.form_type]}</h1>
          <p className="text-slate-500">Submitted {new Date(sub.submitted_at).toLocaleString('en-NZ')}</p>
        </div>
        <span className={`badge-${sub.status} text-sm px-3 py-1`}>{sub.status}</span>
      </div>

      {/* Split Screen */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Completed Form */}
        <div className="card overflow-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-navy">Completed Form</h2>
            <button onClick={() => window.print()} className="btn-secondary text-xs py-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>
          {FormComponent && <FormComponent data={displayData} onChange={() => {}} readOnly />}
        </div>

        {/* RIGHT: AI Summary */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-navy flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </span>
                AI Summary
              </h2>
              <button onClick={generateSummary} disabled={loadingSummary} className="btn-secondary text-xs py-1">
                {loadingSummary ? 'Generating...' : 'Regenerate'}
              </button>
            </div>

            {loadingSummary ? (
              <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                <span>Generating AI summary...</span>
              </div>
            ) : summary ? (
              <div className="prose prose-sm prose-slate max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No summary generated yet.</p>
            )}
          </div>

          {/* Agent Notes */}
          <div className="card">
            <h3 className="text-sm font-semibold text-navy mb-3">Agent Notes</h3>
            <textarea
              className="input h-32"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add your notes about this submission..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={markReviewed}
              disabled={saving || sub.status === 'reviewed'}
              className="btn-primary flex-1 justify-center"
            >
              {saving ? 'Saving...' : sub.status === 'reviewed' ? 'Already Reviewed' : 'Mark as Reviewed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
