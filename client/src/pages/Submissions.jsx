import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Submissions() {
  const { api } = useAuth();
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState({ form_type: '', status: '' });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [search, setSearch] = useState('');

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

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const term = search.trim().toLowerCase();
  const filteredSubs = term
    ? subs.filter(s =>
        (s.client_name || '').toLowerCase().includes(term) ||
        (s.client_email || '').toLowerCase().includes(term)
      )
    : subs;

  // Group submissions by client + form_category + date (same day)
  const grouped = {};
  filteredSubs.forEach(s => {
    const date = new Date(s.submitted_at).toLocaleDateString('en-NZ');
    const key = `${s.client_name}-${s.form_category}-${date}`;
    if (!grouped[key]) {
      grouped[key] = {
        client_name: s.client_name,
        client_email: s.client_email,
        form_category: s.form_category,
        date,
        submissions: [],
        latestStatus: s.status,
        latestDate: s.submitted_at
      };
    }
    grouped[key].submissions.push(s);
  });

  const groups = Object.entries(grouped);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
        <p className="text-slate-500 mt-1">{subs.length} submission{subs.length !== 1 ? 's' : ''} across {groups.length} group{groups.length !== 1 ? 's' : ''}</p>
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
        <input
          type="search"
          aria-label="Search submissions by client"
          className="input w-full sm:w-64 sm:ml-auto"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="card">
            <p className="text-slate-400 text-center py-8">
              {term ? `No matches for "${search}".` : 'No submissions found.'}
            </p>
          </div>
        ) : (
          groups.map(([key, group]) => {
            const isExpanded = expandedGroups[key];
            const allReviewed = group.submissions.every(s => s.status === 'reviewed');
            const anySubmitted = group.submissions.some(s => s.status === 'submitted');

            return (
              <div key={key} className="card p-0 overflow-hidden">
                {/* Group Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleGroup(key)}
                >
                  <div className="flex items-center gap-4">
                    {/* Expand/collapse arrow */}
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>

                    {/* Client avatar */}
                    <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white font-bold text-sm">
                      {group.client_name.charAt(0)}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900">{group.client_name}</p>
                      <p className="text-xs text-slate-500">
                        <span className="capitalize">{group.form_category}</span> Forms · {group.submissions.length} form{group.submissions.length !== 1 ? 's' : ''} · {group.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      allReviewed ? 'bg-green-50 text-green-700' :
                      anySubmitted ? 'bg-blue-50 text-blue-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {allReviewed ? 'All Reviewed' : anySubmitted ? 'Needs Review' : 'Pending'}
                    </span>

                    {/* Quick review all button */}
                    {group.submissions.length === 1 ? (
                      <Link
                        to={`/submissions/${group.submissions[0].id}`}
                        onClick={e => e.stopPropagation()}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Review
                      </Link>
                    ) : (
                      <Link
                        to={`/submissions/${group.submissions[0].id}`}
                        onClick={e => e.stopPropagation()}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Review All
                      </Link>
                    )}
                  </div>
                </div>

                {/* Expanded individual forms */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {group.submissions.map((s, i) => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between px-5 py-3 pl-16 ${
                          i < group.submissions.length - 1 ? 'border-b border-slate-50' : ''
                        } hover:bg-slate-50`}
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-slate-700">{formLabel(s.form_type)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge-${s.status} text-xs`}>{s.status}</span>
                          <Link to={`/submissions/${s.id}`} className="text-primary text-xs font-medium hover:underline">
                            Review →
                          </Link>
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
