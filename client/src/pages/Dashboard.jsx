import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { api, agent } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api('/api/submissions/stats/overview').then(setStats),
      api('/api/submissions?limit=5').then(data => setRecent(data.slice(0, 5)))
    ]).finally(() => setLoading(false));
  }, []);

  const formLabel = (t) => ({
    market_appraisal: 'Market Appraisal', vendor_disclosure: 'Vendor Disclosure',
    agency_agreement: 'Agency Agreement', purchaser_acknowledgement: 'Purchaser Acknowledgement',
    sale_purchase_agreement: 'Sale & Purchase'
  }[t] || t);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, {agent?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Clients', value: stats?.totalClients ?? '—', color: 'bg-blue-50 text-blue-600', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { label: 'Sent (last 30 days)', value: stats?.formsSentMonth ?? '—', color: 'bg-purple-50 text-purple-600', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
          { label: 'Submitted', value: stats?.formsSubmitted ?? '—', color: 'bg-green-50 text-green-600', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Pending', value: stats?.formsPending ?? '—', color: 'bg-amber-50 text-amber-600', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              {loading ? (
                <div className="animate-pulse bg-slate-200 h-8 w-16 rounded mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              )}
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Submissions</h2>
          <Link to="/submissions" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="animate-pulse bg-slate-200 h-4 w-32 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-28 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-20 rounded" />
                <div className="animate-pulse bg-slate-200 h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No submissions yet. Send forms to clients to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Client</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Form</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 px-2 font-medium">{s.client_name}</td>
                    <td className="py-3 px-2 text-slate-600">{formLabel(s.form_type)}</td>
                    <td className="py-3 px-2"><span className={`badge-${s.status}`}>{s.status}</span></td>
                    <td className="py-3 px-2 text-slate-500">{new Date(s.submitted_at).toLocaleDateString('en-NZ')}</td>
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
