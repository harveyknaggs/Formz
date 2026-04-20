import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone, company })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Auto-login after signup
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/formz-logo.svg" alt="Formz" className="h-24 mx-auto" />
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-slate-200 -mx-6 -mt-2 px-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                mode === 'login' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                mode === 'signup' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <div>
                <label className="label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+64 21 000 0000" />
              </div>
              <div>
                <label className="label">Company <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="Your agency name" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
