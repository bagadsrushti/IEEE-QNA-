import React from 'react';
import { MessageSquare, QrCode, Shield, LogOut, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ activeView, setActiveView, onOpenQR, onOpenRecluster }) => {
  const { isAuthenticated, admin, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('submit')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-teal-700 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <MessageSquare className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">QuestionCluster<span className="text-teal-600">.AI</span></span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  <Sparkles className="w-3 h-3 mr-1 text-teal-500" /> Multilingual MiniLM
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">EN • हिंदी • मराठी • Hinglish Question Analytics</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {activeView === 'dashboard' ? (
              <>
                <button
                  onClick={onOpenQR}
                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Display QR code for participants"
                >
                  <QrCode className="w-4 h-4 mr-1.5 text-slate-600" />
                  <span className="hidden md:inline">Public</span> QR Code
                </button>

                <button
                  onClick={onOpenRecluster}
                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
                  title="Re-run Agglomerative Clustering on all questions"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5 text-teal-600" />
                  <span className="hidden md:inline">AI</span> Recluster
                </button>

                <button
                  onClick={() => setActiveView('submit')}
                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Public View
                </button>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center space-x-2">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-semibold text-slate-800">{admin?.name || 'Admin'}</p>
                    <p className="text-[10px] text-slate-500">{admin?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveView(isAuthenticated ? 'dashboard' : 'login')}
                  className="inline-flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Shield className="w-4 h-4 mr-1.5 text-slate-600" />
                  {isAuthenticated ? 'Admin Dashboard' : 'Admin Login'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
