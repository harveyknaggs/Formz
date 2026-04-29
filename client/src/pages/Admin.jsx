import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Admin() {
  const { api, agent } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    api('/api/auth/admin/agents')
      .then(data => { setAgents(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const toggleAdmin = async (id) => {
    try {
      await api(`/api/auth/admin/agents/${id}/toggle-admin`, { method: 'PUT' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteAgent = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    try {
      await api(`/api/auth/admin/agents/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!agent?.is_admin) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
        <p className="text-slate-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const term = search.trim().toLowerCase();
  const filteredAgents = term
    ? agents.filter(a =>
        (a.name || '').toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term)
      )
    : agents;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-500 mt-1">{agents.length} registered user{agents.length !== 1 ? 's' : ''}</p>
        </div>
        {agents.length > 0 && (
          <input
            type="search"
            aria-label="Search users by name or email"
            className="input w-full sm:w-72"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-3xl font-bold text-navy mt-1">{agents.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Admins</p>
          <p className="text-3xl font-bold text-navy mt-1">{agents.filter(a => a.is_admin).length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Gmail Connected</p>
          <p className="text-3xl font-bold text-navy mt-1">{agents.filter(a => a.gmail_email).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 font-medium text-slate-500">User</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Company</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Gmail</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Clients</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Forms</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Submissions</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Role</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Joined</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No matches for "{search}".
                  </td>
                </tr>
              ) : filteredAgents.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {a.photo_url ? (
                          <img src={a.photo_url} alt={a.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">{(a.name || '?').slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.email}</p>
                        {a.phone && <p className="text-xs text-slate-400">{a.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{a.company || '—'}</td>
                  <td className="py-3 px-3">
                    {a.gmail_email ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{a.gmail_email}</span>
                    ) : (
                      <span className="text-xs text-slate-400">Not connected</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{a.client_count}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{a.forms_sent}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium">{a.submissions_count}</td>
                  <td className="py-3 px-3">
                    {a.is_admin ? (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-medium">Admin</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Agent</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-xs">{new Date(a.created_at).toLocaleDateString('en-NZ')}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAdmin(a.id)}
                        className="text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                        title={a.is_admin ? 'Remove admin' : 'Make admin'}
                      >
                        {a.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      {a.id !== agent.id && (
                        <button
                          onClick={() => deleteAgent(a.id, a.name)}
                          className="text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
