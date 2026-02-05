
import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/print/layout/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import OwnerPortal from './pages/OwnerPortal';
import OwnerView from './pages/OwnerView';
import { Toaster } from 'react-hot-toast';

// Static imports for stability and to prevent Error #130
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import People from './pages/People';
import Contracts from './pages/Contracts';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
// FIX: Changed import path to correct file
import Settings from './pages/Settings';
import Leads from './pages/Leads';
import CommunicationHub from './pages/CommunicationHub';
import LandsAndCommissions from './pages/LandsAndCommissions';

const hexToHsl = (hex: string): string => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const PageLoader: React.FC = () => (
    <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-text-muted animate-pulse">جاري تحميل نظام Rentrix...</p>
        </div>
    </div>
);

const App: React.FC = () => {
  const { settings, auth } = useApp();

  useEffect(() => {
    if (settings) {
        document.documentElement.setAttribute('data-theme', settings.appearance.theme);
        document.title = settings.general.company.name || 'Rentrix';
        if (settings.appearance?.primaryColor) {
            document.documentElement.style.setProperty('--color-primary', hexToHsl(settings.appearance.primaryColor));
        }
    }
  }, [settings]);

  if (settings === undefined || auth.currentUser === undefined) {
    return <PageLoader />;
  }

  return (
    <>
      <Toaster position="top-center" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/portal/:ownerId" element={<OwnerPortal />} />
          <Route path="/owner-view/:ownerId" element={<OwnerView />} />

          {!auth.currentUser ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : auth.currentUser.mustChange ? (
            <Route path="*" element={<ChangePassword />} />
          ) : (
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              
              {/* Operation Hub */}
              <Route path="/properties" element={<Properties />} />
              <Route path="/people" element={<People />} />
              <Route path="/contracts" element={<Contracts />} />
              
              {/* Finance Hub (Unified) */}
              <Route path="/finance/*" element={<Finance />} />
              
              {/* CRM & Growth */}
              <Route path="/leads" element={<Leads />} />
              <Route path="/communication" element={<CommunicationHub />} />
              <Route path="/lands" element={<LandsAndCommissions />} />
              
              {/* Analytics & Admin Hub */}
              <Route path="/reports" element={<Reports />} />
              {auth.currentUser.role === 'ADMIN' && (
                <Route path="/settings/*" element={<Settings />} />
              )}
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </>
  );
};

export default App;