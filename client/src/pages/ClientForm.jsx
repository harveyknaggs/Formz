import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ClientForm() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formInfo, setFormInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/public/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d)))
      .then(data => {
        setFormInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.error || 'Form not found or expired');
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0099cc] mx-auto mb-4" />
          <p className="text-slate-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Form Unavailable</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // Redirect to the server-rendered HTML form
  // The server injects submission logic into the raw HTML
  return (
    <div className="min-h-screen bg-slate-50">
      <iframe
        src={`/api/forms/html/${token}`}
        className="w-full min-h-screen border-0"
        style={{ height: '100vh', width: '100%', border: 'none' }}
        title={`${formInfo.form_category} Forms`}
      />
    </div>
  );
}
