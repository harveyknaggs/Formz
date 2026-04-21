import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { api, agent } = useAuth();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', phone: '', currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [gmail, setGmail] = useState({ connected: false, email: null, needs_reconnect: false, loading: true });

  useEffect(() => {
    if (agent) setForm(f => ({ ...f, name: agent.name || '', phone: agent.phone || '' }));
  }, [agent]);

  useEffect(() => {
    api('/api/gmail/status').then(data => setGmail({ ...data, loading: false })).catch(() => setGmail(g => ({ ...g, loading: false })));

    const gmailParam = searchParams.get('gmail');
    if (gmailParam === 'connected') {
      const email = searchParams.get('email');
      setGmail({ connected: true, email, needs_reconnect: false, loading: false });
      setMsg(`Gmail connected: ${email}`);
    } else if (gmailParam === 'error') {
      setMsg(`Error connecting Gmail: ${searchParams.get('reason') || 'Unknown error'}`);
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const changingPassword = Boolean(form.newPassword);
    try {
      const body = { name: form.name, phone: form.phone };
      if (changingPassword) {
        body.currentPassword = form.currentPassword;
        body.newPassword = form.newPassword;
      }
      await api('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) });
      setMsg(changingPassword ? 'Password updated successfully.' : 'Settings saved successfully.');
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const connectGmail = async () => {
    try {
      const data = await api('/api/gmail/connect');
      window.location.href = data.url;
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const disconnectGmail = async () => {
    try {
      await api('/api/gmail/disconnect', { method: 'POST' });
      setGmail({ connected: false, email: null, needs_reconnect: false, loading: false });
      setMsg('Gmail disconnected.');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile and email integration</p>
      </div>

      <div className="space-y-6 max-w-lg">
        {msg && <div className={`p-3 rounded-lg text-sm ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg}</div>}

        {gmail.needs_reconnect && !gmail.connected && !gmail.loading && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Your Gmail connection expired</p>
              <p className="text-xs text-amber-800 mt-1 mb-3">Please reconnect so your clients receive emails from your address.</p>
              <button onClick={connectGmail} className="text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition">
                Reconnect Gmail
              </button>
            </div>
          </div>
        )}

        {/* Gmail Integration */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
            Gmail Integration
          </h2>

          {gmail.loading ? (
            <p className="text-slate-400 text-sm">Checking Gmail connection...</p>
          ) : gmail.connected ? (
            <div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-green-800">Connected</p>
                  <p className="text-xs text-green-600">{gmail.email}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">All form emails will be sent from your Gmail account.</p>
              <button onClick={disconnectGmail} className="text-sm text-red-600 hover:underline">Disconnect Gmail</button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 mb-4">Connect your Gmail to send form emails directly from your email address. Clients will receive emails from you, not a generic address.</p>
              <button onClick={connectGmail} className="btn-primary">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                Connect Gmail
              </button>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>

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
    </div>
  );
}
