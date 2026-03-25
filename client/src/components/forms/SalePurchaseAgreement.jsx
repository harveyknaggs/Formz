export default function SalePurchaseAgreement({ readOnly }) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-navy">Sale & Purchase Agreement</h2>
        <p className="text-sm text-slate-500">ADLS / REINZ Agreement for Sale and Purchase of Real Estate</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-navy/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-navy mb-2">ADLS/REINZ Agreement</h3>
        <p className="text-sm text-slate-600 mb-4">
          The Sale & Purchase Agreement is a standardised ADLS/REINZ document.
          This form will be prepared by your agent and provided as a PDF for review and signing.
        </p>
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="space-y-3 text-left text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Standard ADLS/REINZ Tenth Edition (or as current)</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Includes property details, purchase price, conditions, and settlement date</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Will be provided for review by your solicitor before signing</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Contact your agent for the prepared agreement document</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          This is an information page. The actual Sale & Purchase Agreement document will be prepared and provided by your agent.
        </p>
      </div>
    </div>
  );
}
