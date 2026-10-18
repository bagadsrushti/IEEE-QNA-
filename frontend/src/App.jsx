import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import SubmitPage from './pages/SubmitPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import QRCodeModal from './components/QRCodeModal';
import ReclusterModal from './components/ReclusterModal';
import { clusterAPI } from './services/api';

const MainApp = () => {
  const [activeView, setActiveView] = useState('submit'); // 'submit' | 'login' | 'dashboard'
  const [isQROpen, setIsQROpen] = useState(false);
  const [isReclusterOpen, setIsReclusterOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const handleReclusterExecute = async (threshold) => {
    const res = await clusterAPI.recluster(threshold);
    return res.data;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      {activeView !== 'submit' && (
        <Navbar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenQR={() => setIsQROpen(true)}
          onOpenRecluster={() => setIsReclusterOpen(true)}
        />
      )}

      <main className="flex-1">
        {activeView === 'submit' && (
          <SubmitPage
            onNavigateToAdmin={() => setActiveView(isAuthenticated ? 'dashboard' : 'login')}
          />
        )}

        {activeView === 'login' && (
          <AdminLoginPage
            onLoginSuccess={() => setActiveView('dashboard')}
            onBackToPublic={() => setActiveView('submit')}
          />
        )}

        {activeView === 'dashboard' && (
          isAuthenticated ? (
            <AdminDashboard
              onOpenQR={() => setIsQROpen(true)}
              onOpenReclusterTrigger={() => setIsReclusterOpen(true)}
            />
          ) : (
            <AdminLoginPage
              onLoginSuccess={() => setActiveView('dashboard')}
              onBackToPublic={() => setActiveView('submit')}
            />
          )
        )}
      </main>

      {/* Global QR Code Modal */}
      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      {/* Global Recluster Modal */}
      <ReclusterModal
        isOpen={isReclusterOpen}
        onClose={() => setIsReclusterOpen(false)}
        onRecluster={handleReclusterExecute}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
