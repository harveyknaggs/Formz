import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function FormsSent() {
  const { api } = useAuth();
  const [forms, setForms] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api('/api/forms/sent').then(setForms).catch(console.error).finally(() => setLoading(false));
  }, []);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase', vendor_forms: 'Vendor Forms',
    buyer_forms: 'Buyer Forms'
  }[t] || t);

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const term = search.trim().toLowerCase();
  const filteredForms = term
    ? forms.filter(f =>
        (f.client_name || '').toLowerCase().includes(term) ||
        (f.client_email || '').toLowerCase().includes(term)
      )
    : forms;

  // Group by client + category + sent date
  const grouped = {};
  filteredForms.forEach(f => {
    const date = new Date(f.created_at).toLocaleDateString('en-NZ');
    const key = `${f.client_name}-${f.form_category}-${date}`;
    if (!grouped[key]) {
      grouped[key] = {
        client_name: f.client_name,
        client_email: f.client_email,
        form_category: f.form_category,
        date,
        expires: new Date(f.expires_at).toLocaleDateString('en-NZ'),
        forms: []
      };
    }
    grouped[key].forms.push(f);
  });

  const groups = Object.entries(grouped);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Forms Sent</h1>
        <p className="text-slate-500 mt-1">{forms.length} form{forms.length !== 1 ? 's' : ''} sent across {groups.length} group{groups.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Search */}
      {!loading && forms.length > 0 && (
        <div className="mb-4 flex justify-end">
          <input
            type="search"
            aria-label="Search forms sent by client name"
            className="input w-full sm:w-72"
            placeholder="Search by client name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [0, 1, 2].map(i => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="animate-pulse bg-slate-200 w-4 h-4 rounded" />
                  <div className="animate-pulse bg-slate-200 w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <div className="animate-pulse bg-slate-200 h-4 w-40 rounded" />
                    <div className="animate-pulse bg-slate-200 h-3 w-56 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="animate-pulse bg-slate-200 h-3 w-24 rounded" />
                  <div className="animate-pulse bg-slate-200 h-6 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : groups.length === 0 ? (
          <div className="card">
            <p className="text-slate-400 text-center py-8">
              {term ? `No matches for "${search}".` : 'No forms sent yet.'}
            </p>
          </div>
        ) : (
          groups.map(([key, group]) => {
            const isExpanded = expandedGroups[key];
            const allSubmitted = group.forms.every(f => f.submission_status === 'submitted' || f.submission_status === 'reviewed');
            const anySubmitted = group.forms.some(f => f.submission_status);
            const allPending = group.forms.every(f => f.status === 'pending' && !f.submission_status);

            return (
              <div key={key} className="card p-0 overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleGroup(key)}
                >
                  <div className="flex items-center gap-4">
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white font-bold text-sm">
                      {group.client_name.charAt(0)}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">{group.client_name}</p>
                      <p className="text-xs text-slate-500">
                        <span className="capitalize">{group.form_category}</span> Forms · {group.forms.length} form{group.forms.length !== 1 ? 's' : ''} · Sent {group.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Expires {group.expires}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      allSubmitted ? 'bg-green-50 text-green-700' :
                      anySubmitted ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {allSubmitted ? 'Submitted' : anySubmitted ? 'Partially Submitted' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Expanded individual forms */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {group.forms.map((f, i) => (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between px-5 py-3 pl-16 ${
                          i < group.forms.length - 1 ? 'border-b border-slate-50' : ''
                        } hover:bg-slate-50`}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-slate-700">{formLabel(f.form_type)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge-${f.submission_status || f.status} text-xs`}>
                            {f.submission_status || f.status}
                          </span>
                          {f.submission_id ? (
                            <Link to={`/submissions/${f.submission_id}`} className="text-primary text-xs font-medium hover:underline">
                              Review →
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">Awaiting</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
