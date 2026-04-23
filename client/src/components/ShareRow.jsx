import { useState } from 'react';

async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function ShareRow({ url, title }) {
  const [copied, setCopied] = useState(false);

  const subject = title ? `Listing: ${title}` : 'Property listing';
  const body = `${title ? title + '\n' : ''}${url}`;

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-slate-700">Share this listing</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(body)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0012.01 0C5.4 0 .06 5.34.06 11.95c0 2.1.55 4.16 1.6 5.97L0 24l6.3-1.63a11.98 11.98 0 005.72 1.46h.01c6.6 0 11.94-5.34 11.94-11.95 0-3.19-1.24-6.19-3.45-8.4zM12.03 21.6a9.62 9.62 0 01-4.91-1.34l-.35-.21-3.74.97 1-3.65-.23-.37a9.66 9.66 0 01-1.48-5.05c0-5.35 4.35-9.7 9.71-9.7 2.59 0 5.02 1.01 6.85 2.84a9.64 9.64 0 012.84 6.85c0 5.35-4.35 9.7-9.7 9.7zm5.34-7.26c-.29-.15-1.72-.85-1.99-.95-.27-.1-.46-.15-.66.15-.19.29-.75.95-.92 1.15-.17.19-.34.21-.63.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.71-1.61-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.66-1.58-.9-2.17-.24-.58-.48-.5-.66-.5-.17-.01-.36-.01-.56-.01-.19 0-.51.07-.77.36-.27.29-1.02 1-1.02 2.44 0 1.44 1.05 2.84 1.2 3.03.15.19 2.07 3.16 5 4.43.7.3 1.25.48 1.67.62.7.22 1.34.19 1.84.12.56-.08 1.72-.7 1.97-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.19-.56-.34z"/></svg>
            WhatsApp
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(body)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.37 0-2.66-.27-3.81-.75L3 20l.88-4.07A8.95 8.95 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            Text
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Email
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7"/>
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V5a2 2 0 012-2h7a2 2 0 012 2v12a2 2 0 01-2 2h-2M15 9H6a2 2 0 00-2 2v8a2 2 0 002 2h9a2 2 0 002-2v-8a2 2 0 00-2-2z"/>
                </svg>
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
