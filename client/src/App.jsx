import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import FormsSent from './pages/FormsSent';
import Submissions from './pages/Submissions';
import SubmissionReview from './pages/SubmissionReview';
import Settings from './pages/Settings';
import ClientForm from './pages/ClientForm';
import FormConfirmation from './pages/FormConfirmation';

function PrivateRoute({ children }) {
  const { agent, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  return agent ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { agent, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/form/:token" element={<ClientForm />} />
      <Route path="/form/:token/confirmation" element={<FormConfirmation />} />
      <Route path="/login" element={agent ? <Navigate to="/dashboard" /> : <Login />} />

      {/* Agent routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="forms-sent" element={<FormsSent />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="submissions/:id" element={<SubmissionReview />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
