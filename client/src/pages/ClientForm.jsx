import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarketAppraisal from '../components/forms/MarketAppraisal';
import VendorDisclosure from '../components/forms/VendorDisclosure';
import AgencyAgreement from '../components/forms/AgencyAgreement';
import PurchaserAcknowledgement from '../components/forms/PurchaserAcknowledgement';
import SalePurchaseAgreement from '../components/forms/SalePurchaseAgreement';

const FORM_COMPONENTS = {
  market_appraisal: MarketAppraisal,
  vendor_disclosure: VendorDisclosure,
  agency_agreement: AgencyAgreement,
  purchaser_acknowledgement: PurchaserAcknowledgement,
  sale_purchase_agreement: SalePurchaseAgreement,
};

const FORM_LABELS = {
  market_appraisal: 'Market Appraisal',
  vendor_disclosure: 'Vendor Disclosure',
  agency_agreement: 'Agency Agreement',
  purchaser_acknowledgement: 'Purchaser Acknowledgement',
  sale_purchase_agreement: 'Sale & Purchase Agreement',
};

const VENDOR_TABS = ['market_appraisal', 'vendor_disclosure', 'agency_agreement'];
const BUYER_TABS = ['purchaser_acknowledgement', 'sale_purchase_agreement'];

export default function ClientForm() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formInfo, setFormInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetch(`/api/forms/public/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d)))
      .then(data => {
        setFormInfo(data);
        setActiveTab(data.form_type);
        setLoading(false);
      })
      .catch(err => {
        setError(err.error || 'Form not found or expired');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/submissions/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate(`/form/${token}/confirmation`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="card max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Form Unavailable</h1>
        <p className="text-slate-600">{error}</p>
      </div>
    </div>
  );

  const tabs = formInfo.form_category === 'vendor' ? VENDOR_TABS : BUYER_TABS;
  const FormComponent = FORM_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <img src="/formz-logo.svg" alt="Formz" className="h-10" />
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Prepared for: <strong className="text-slate-800">{formInfo.client_name}</strong></p>
              <p>Agent: {formInfo.agent_name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="bg-white border-b border-slate-200 no-print">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {FORM_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card">
          {FormComponent && (
            <FormComponent
              data={formData[activeTab]}
              onChange={(d) => setFormData(prev => ({ ...prev, [activeTab]: d }))}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 no-print">
          <button onClick={handlePrint} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print / Save PDF
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-lg px-8 py-3">
            {submitting ? 'Submitting...' : 'Submit Form'}
          </button>
        </div>
      </div>
    </div>
  );
}
