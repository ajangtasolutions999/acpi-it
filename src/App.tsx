import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Module Views
import { DashboardView } from './views/DashboardView';
import { SOPView } from './views/SOPView';
import { FormsView } from './views/FormsView';
import { ApprovalCenterView } from './views/ApprovalCenterView';
import { AssetManagementView } from './views/AssetManagementView';
import { TicketingView } from './views/TicketingView';
import { ReportsView } from './views/ReportsView';
import { AuditTrailView } from './views/AuditTrailView';
import { AdminView } from './views/AdminView';

const MainApplication: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navParams, setNavParams] = useState<any>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-white text-sm font-semibold tracking-wide">
          Connecting to ACPI Information & Ticketing System...
        </h2>
        <p className="text-slate-400 text-xs mt-1">PT Alliance Consumer Products Indonesia</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleNavigate = (tab: string, params?: any) => {
    setCurrentTab(tab);
    setNavParams(params || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSearchResult = (tab: string, item: any) => {
    if (tab === 'tickets') {
      setCurrentTab('tickets');
      setNavParams({ selectId: item.id });
    } else if (tab === 'forms') {
      setCurrentTab('forms');
      setNavParams({ selectId: item.id });
    } else if (tab === 'assets') {
      setCurrentTab('assets');
      setNavParams({ selectId: item.id });
    } else if (tab === 'sops') {
      setCurrentTab('sops');
      setNavParams({ selectId: item.id });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex text-slate-800 antialiased font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          currentTab={currentTab}
          onNavigate={handleNavigate}
        />

        {/* Module Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {currentTab === 'sops' && <SOPView />}
            {currentTab === 'forms' && <FormsView initialSelectId={navParams?.selectId} />}
            {currentTab === 'approvals' && <ApprovalCenterView />}
            {currentTab === 'assets' && <AssetManagementView />}
            {currentTab === 'tickets' && (
              <TicketingView
                initialSelectId={navParams?.selectId}
                initialFilter={navParams?.filter}
              />
            )}
            {currentTab === 'reports' && <ReportsView />}
            {currentTab === 'audit' && <AuditTrailView />}
            {currentTab === 'admin' && <AdminView />}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApplication />
    </AuthProvider>
  );
}
