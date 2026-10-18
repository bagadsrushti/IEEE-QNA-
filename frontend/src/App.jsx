import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import SubmitPage from './pages/SubmitPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import QRCodeModal from './components/QRCodeModal';
import ReclusterModal from './components/ReclusterModal';
import { clusterAPI } from './services/api';

const getViewFromLocation = () => {
  try {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#/dashboard' || hash === '#dashboard' || hash === '#admin') {
      return 'dashboard';
    }
    if (hash === '#/login' || hash === '#login') {
      return 'login';
    }
    const stored = localStorage.getItem('cluster_ai_active_view');
    if (stored === 'dashboard' || stored === 'login') {
      return stored;
    }
  } catch {}
  return 'submit';
};

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveViewState] = useState(getViewFromLocation);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isReclusterOpen, setIsReclusterOpen] = useState(false);

  const changeView = (view) => {
    setActiveViewState(view);
    try {
      localStorage.setItem('cluster_ai_active_view', view);
      if (view === 'dashboard') {
        window.location.hash = '#/dashboard';
      } else if (view === 'login') {
        window.location.hash = '#/login';
      } else {
        window.location.hash = '';
      }
    } catch {}
  };

  useEffect(() => {
    const handleHashChange = () => {
      const v = getViewFromLocation();
      setActiveViewState(v);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cluster_ai_active_view', activeView);
      if (activeView === 'dashboard' && window.location.hash !== '#/dashboard') {
        window.location.hash = '#/dashboard';
      } else if (activeView === 'login' && window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    } catch {}
  }, [activeView]);

  const handleReclusterExecute = async (threshold) => {
    const res = await clusterAPI.recluster(threshold);
    return res.data;
  };

  if (loading && !isAuthenticated && localStorage.getItem('cluster_ai_token') && activeView === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">Restoring Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      {activeView !== 'submit' && (
        <Navbar
          activeView={activeView}
          setActiveView={changeView}
          onOpenQR={() => setIsQROpen(true)}
          onOpenRecluster={() => setIsReclusterOpen(true)}
        />
      )}

      <main className="flex-1">
        {activeView === 'submit' && (
          <SubmitPage
            onNavigateToAdmin={() => changeView(isAuthenticated ? 'dashboard' : 'login')}
          />
        )}

        {activeView === 'login' && (
          <AdminLoginPage
            onLoginSuccess={() => changeView('dashboard')}
            onBackToPublic={() => changeView('submit')}
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
              onLoginSuccess={() => changeView('dashboard')}
              onBackToPublic={() => changeView('submit')}
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
