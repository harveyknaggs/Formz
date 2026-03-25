export default function FormConfirmation() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="card max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Form Submitted</h1>
        <p className="text-slate-600 mb-4">
          Thank you for completing and submitting your form. Your agent will review it and be in touch shortly.
        </p>
        <p className="text-sm text-slate-400">You may now close this window.</p>
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm font-semibold text-navy">Hometown Real Estate</p>
          <p className="text-xs text-primary">@realty</p>
        </div>
      </div>
    </div>
  );
}
