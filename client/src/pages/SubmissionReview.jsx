import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { getSectionsFor, fieldsForSection, orphanFields, signaturesForSection } from '../lib/formSections';

const ART_CLASS = { rows: 'vendor', scribble: 'buyer', stack: 'stack' };

function CardArt({ kind }) {
  if (kind === 'rows') {
    return <div className="art-rows"><div className="r r1" /><div className="r r2" /><div className="r r3" /><div className="r r4" /></div>;
  }
  if (kind === 'scribble') {
    return (
      <div className="art-sign">
        <div className="pad" />
        <svg className="scribble" viewBox="0 0 130 30" preserveAspectRatio="none">
          <path d="M2 22 C 12 8, 22 30, 32 14 S 52 22, 62 12 S 82 26, 92 16 S 112 10, 124 18" />
        </svg>
        <div className="check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
        </div>
      </div>
    );
  }
  return <div className="art-stack"><div className="s s1" /><div className="s s2" /><div className="s s3" /></div>;
}

const FORM_LABELS = {
  market_appraisal: 'Market Appraisal',
  vendor_disclosure: 'Vendor Disclosure',
  agency_agreement: 'Agency Agreement',
  purchaser_acknowledgement: 'Purchaser Acknowledgement',
  sale_purchase_agreement: 'Sale & Purchase Agreement',
  vendor_forms: 'Vendor Forms',
  buyer_forms: 'Buyer Forms',
};

// Parses both Postgres (ISO 8601) and SQLite ("2026-04-21 12:26:04") timestamps.
function formatNZDate(value) {
  if (!value) return '';
  let d = new Date(value);
  if (isNaN(d.getTime())) d = new Date(String(value).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-NZ');
}

export default function SubmissionReview() {
  const { id } = useParams();
  const { api } = useAuth();
  const [sub, setSub] = useState(null);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedSigs, setExpandedSigs] = useState(() => new Set());
  const [activeSectionId, setActiveSectionId] = useState(null);

  const toggleSigDetails = (sigId) => {
    setExpandedSigs(prev => {
      const next = new Set(prev);
      if (next.has(sigId)) next.delete(sigId); else next.add(sigId);
      return next;
    });
  };

  useEffect(() => {
    api(`/api/submissions/${id}`).then(data => {
      setSub(data);
      setNotes(data.agent_notes || '');
      setSummary(data.ai_summary || '');
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

  const formData = sub.form_data || {};

  // Separate signatures from other data
  const signatures = {};
  Object.entries(formData).forEach(([key, value]) => {
    if (key.startsWith('sig_')) {
      const sigName = key.replace('sig_', '');
      signatures[sigName] = {
        image: value,
        name: formData['name_' + sigName] || '',
        timestamp: formData['ts_' + sigName] || ''
      };
    }
  });

  // Sub-form sections
  const sections = getSectionsFor(sub.form_category);
  const sectionsWithCounts = sections.map(s => ({
    ...s,
    fieldCount: fieldsForSection(formData, s).length,
    sigCount: signaturesForSection(sub.signatures || [], s).length
  }));
  const orphans = orphanFields(formData, sections);
  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  // Fields visible under the active card
  const activeFieldEntries = fieldsForSection(formData, activeSection);
  const fieldsToRender = activeSection.id === sections[0].id
    ? [...activeFieldEntries, ...orphans]
    : activeFieldEntries;

  // Signature image cards under active section (matched by name keyword)
  const visibleSigImages = Object.entries(signatures).filter(([name]) => {
    const lower = name.toLowerCase();
    return activeSection.signatures.some(k => lower.includes(k));
  });

  // Audit trail rows under active section
  const visibleAuditSigs = signaturesForSection(sub.signatures || [], activeSection);

  return (
    <div>
      <Link to="/submissions" className="text-sm text-primary hover:underline mb-4 inline-block">← Back to Submissions</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sub.client_name} — {FORM_LABELS[sub.form_type] || sub.form_type}</h1>
          <p className="text-slate-500">Submitted {formatNZDate(sub.submitted_at)}</p>
        </div>
        <span className={`badge-${sub.status} text-sm px-3 py-1`}>{sub.status}</span>
      </div>

      {/* Split Screen */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Completed Form */}
        <div className="card overflow-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-navy">Completed Form</h2>
            <button onClick={() => window.print()} className="btn-secondary text-xs py-1">Print</button>
          </div>

          {/* Sub-form picker cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {sectionsWithCounts.map((s, i) => {
              const colorClass = ART_CLASS[s.art] || 'vendor';
              const isActive = activeSection.id === s.id;
              const totalCount = s.fieldCount + s.sigCount;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveSectionId(s.id)}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setActiveSectionId(s.id)}
                  className={`pick-card pick-card--tab ${colorClass} ${isActive ? 'is-selected' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="pick-num">{String(i + 1).padStart(2, '0')}</span>
                    {s.referenceOnly ? (
                      <span className="pick-tag"><span className="pip" />Reference</span>
                    ) : (
                      <span className="pick-tag"><span className="pip" />{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</span>
                    )}
                  </div>
                  <div className="pick-art"><CardArt kind={s.art} /></div>
                  <h3 className="font-semibold text-navy leading-snug mb-1">{s.title}</h3>
                  <p className="pick-desc text-slate-500">{s.description}</p>
                  <div className="pick-foot">
                    <span className="meta">
                      {s.referenceOnly
                        ? <b>Info</b>
                        : <><b>{s.fieldCount}</b> {s.fieldCount === 1 ? 'field' : 'fields'} · <b>{s.sigCount}</b> sig</>}
                    </span>
                    <span className="cta">
                      {isActive ? 'Viewing' : 'View'}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active section heading */}
          <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">{activeSection.title}</h3>

          {/* Form Fields for active section */}
          {activeSection.referenceOnly ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
              This is a reference document — no fields were filled in. Buyers / vendors viewed this content as part of the pack.
            </div>
          ) : fieldsToRender.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No fields submitted for this form.</p>
          ) : (
            <div className="space-y-4">
              {fieldsToRender.map(([key, value]) => (
                <div key={key} className="border-b border-slate-100 pb-3">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{key}</label>
                  {Array.isArray(value) ? (
                    <ul className="mt-1 text-sm text-slate-800 list-disc list-inside">
                      {value.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-slate-800">{String(value)}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Signatures for active section */}
          {visibleSigImages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy mb-3 uppercase tracking-wide">Signatures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleSigImages.map(([name, sig]) => (
                  <div key={name} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">{name}</h4>
                    {sig.image && (
                      <img src={sig.image} alt={`Signature - ${name}`} className="w-full h-20 object-contain bg-white rounded border border-slate-200 mb-2" />
                    )}
                    {sig.name && <p className="text-sm text-slate-700 font-medium">{sig.name}</p>}
                    {sig.timestamp && <p className="text-xs text-slate-500">{sig.timestamp}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E-signature audit trail (NZ ETA 2002) — filtered to active section */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-navy mb-1 uppercase tracking-wide">E-signature Audit Trail</h3>
            <p className="text-xs text-slate-500 mb-3">NZ Electronic Transactions Act 2002 — identity, intent, and integrity evidence for each signer.</p>
            {visibleAuditSigs.length > 0 ? (
              <div className="space-y-3">
                {visibleAuditSigs.map(s => {
                  const ua = s.signer_ua || '';
                  const hash = s.data_hash || '';
                  const signedAt = formatNZDate(s.signed_at);
                  const isExpanded = expandedSigs.has(s.id);
                  return (
                    <div key={s.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                      <div className="flex items-start gap-3">
                        {s.signature_png && (
                          <img
                            src={s.signature_png}
                            alt={`Signature by ${s.signer_name || 'signer'}`}
                            className="bg-slate-50 border border-slate-200 rounded"
                            style={{ width: '120px', height: '60px', objectFit: 'contain' }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">{s.signer_name || 'Unnamed signer'}</span>
                            {s.signer_role && (
                              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {s.signer_role}
                              </span>
                            )}
                          </div>
                          <dl className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                            <div>
                              <dt className="inline text-slate-500">Signed at: </dt>
                              <dd className="inline text-slate-800">{signedAt || '—'}</dd>
                            </div>
                            <div>
                              <dt className="inline text-slate-500">IP: </dt>
                              <dd className="inline text-slate-800 font-mono">{s.signer_ip || '—'}</dd>
                            </div>
                            {s.client_timestamp && (
                              <div className="sm:col-span-2">
                                <dt className="inline text-slate-500">Client timestamp: </dt>
                                <dd className="inline text-slate-800">{s.client_timestamp}</dd>
                              </div>
                            )}
                          </dl>
                          <button
                            type="button"
                            onClick={() => toggleSigDetails(s.id)}
                            className="mt-2 text-xs text-primary hover:underline"
                          >
                            {isExpanded ? 'Hide verification details' : 'Show verification details'}
                          </button>
                          {isExpanded && (
                            <dl className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 gap-y-1 text-xs">
                              <div className="break-all">
                                <dt className="inline text-slate-500">User agent: </dt>
                                <dd className="inline text-slate-800">{ua || '—'}</dd>
                              </div>
                              <div className="break-all">
                                <dt className="inline text-slate-500">Payload SHA-256: </dt>
                                <dd className="inline text-slate-800 font-mono">{hash || '—'}</dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No signatures on this form.</p>
            )}
          </div>
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
              <div className="text-sm text-slate-700">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h3 className="text-xs font-semibold uppercase tracking-wide text-navy mt-4 mb-1.5 first:mt-0">{children}</h3>,
                    h2: ({ children }) => <h3 className="text-xs font-semibold uppercase tracking-wide text-navy mt-4 mb-1.5 first:mt-0">{children}</h3>,
                    h3: ({ children }) => <h4 className="text-xs font-semibold text-slate-600 mt-3 mb-1">{children}</h4>,
                    p:  ({ children }) => <p className="text-sm text-slate-700 leading-relaxed mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-2 last:mb-0 marker:text-slate-300">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-1 mb-2 last:mb-0 marker:text-slate-400">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-slate-700 leading-relaxed pl-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
                    hr: () => null,
                  }}
                >
                  {summary}
                </ReactMarkdown>
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
