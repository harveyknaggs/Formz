import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Clients() {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [sending, setSending] = useState(false);

  const load = () => api('/api/clients').then(setClients).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api('/api/clients', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', phone: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Client</button>
      </div>

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New Client</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+64 21 ..." />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={sending} className="btn-primary">{sending ? 'Adding...' : 'Add Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="card">
        {clients.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No clients yet. Add your first client to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Phone</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Forms Sent</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Submitted</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-500">Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                    <td className="py-3 px-2">
                      <Link to={`/clients/${c.id}`} className="font-medium text-navy hover:underline">{c.name}</Link>
                    </td>
                    <td className="py-3 px-2 text-slate-600">{c.email}</td>
                    <td className="py-3 px-2 text-slate-600">{c.phone || '—'}</td>
                    <td className="py-3 px-2 text-slate-600">{c.forms_sent}</td>
                    <td className="py-3 px-2 text-slate-600">{c.forms_submitted}</td>
                    <td className="py-3 px-2 text-slate-500">{new Date(c.created_at).toLocaleDateString('en-NZ')}</td>
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
