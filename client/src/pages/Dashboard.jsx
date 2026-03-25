import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { api, agent } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api('/api/submissions/stats/overview').then(setStats).catch(console.error);
    api('/api/submissions?limit=5').then(data => setRecent(data.slice(0, 5))).catch(console.error);
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
          { label: 'Total Clients', value: stats?.totalClients ?? '—', color: 'bg-blue-50 text-blue-700', icon: '👥' },
          { label: 'Sent This Month', value: stats?.formsSentMonth ?? '—', color: 'bg-purple-50 text-purple-700', icon: '📤' },
          { label: 'Submitted', value: stats?.formsSubmitted ?? '—', color: 'bg-green-50 text-green-700', icon: '📋' },
          { label: 'Pending', value: stats?.formsPending ?? '—', color: 'bg-amber-50 text-amber-700', icon: '⏳' },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
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
        {recent.length === 0 ? (
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
