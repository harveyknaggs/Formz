import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { api, agent } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (agent) setForm(f => ({ ...f, name: agent.name || '', phone: agent.phone || '' }));
  }, [agent]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const body = { name: form.name, phone: form.phone };
      if (form.newPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }
      await api('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) });
      setMsg('Settings saved successfully.');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>

      <div className="card max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>

        {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50" value={agent?.email || ''} disabled />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>

          <hr className="my-6" />
          <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button>
        </form>
      </div>
    </div>
  );
}
