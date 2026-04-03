
import React, { lazy, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/print/layout/Layout';
import Login from './pages/Login';
import OwnerView from './pages/OwnerView';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from './components/shared/ProtectedRoute';
import { LEGACY_FINANCIAL_ALIASES } from './routes/modules';
import { NAVIGATION_META } from './config/navigationMeta';

const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Owners = lazy(() => import('./pages/Owners'));
const OwnersHub = lazy(() => import('./pages/OwnersHub'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Finance = lazy(() => import('./pages/Finance'));
const Leads = lazy(() => import('./pages/Leads'));
const CommunicationHub = lazy(() => import('./pages/CommunicationHub'));
const Lands = lazy(() => import('./pages/Lands'));
const Commissions = lazy(() => import('./pages/Commissions'));
const Reports = lazy(() => import('./pages/Reports'));
const SmartAssistant = lazy(() => import('./pages/SmartAssistant'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Settings = lazy(() => import('./pages/System'));

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

const ROUTE_META: Record<string, { title: string; description: string }> = Object.fromEntries(
  Object.entries(NAVIGATION_META)
    .filter(([, meta]) => typeof meta.description === 'string')
    .map(([path, meta]) => [path, { title: meta.titleAr, description: meta.description as string }])
);

const App: React.FC = () => {
  const { settings, auth } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (settings) {
        const theme = settings.appearance?.theme ?? 'light';
        const companyName = settings.general?.company?.name ?? 'Rentrix';
        const primaryColor = settings.appearance?.primaryColor;
        document.documentElement.setAttribute('data-theme', theme);
        const matchedKey = ROUTE_META[location.pathname]
            ? location.pathname
            : Object.keys(ROUTE_META)
              .filter(k => k !== '/')
              .sort((a, b) => b.length - a.length)
              .find(k => location.pathname.startsWith(k)) || '/';
        const routeMeta = ROUTE_META[matchedKey];
        document.title = routeMeta ? `${routeMeta.title} — ${companyName}` : companyName;
        const descEl = document.querySelector('meta[name="description"]');
        if (descEl && routeMeta) descEl.setAttribute('content', routeMeta.description);
        const ogTitleEl = document.querySelector('meta[property="og:title"]');
        if (ogTitleEl && routeMeta) ogTitleEl.setAttribute('content', `${routeMeta.title} — ${companyName}`);
        const ogDescEl = document.querySelector('meta[property="og:description"]');
        if (ogDescEl && routeMeta) ogDescEl.setAttribute('content', routeMeta.description);
        const canonicalUrl = `${window.location.origin}${location.pathname}`;
        const canonicalEl = document.getElementById('canonical-link') as HTMLLinkElement | null;
        if (canonicalEl) canonicalEl.href = canonicalUrl;
        const ogUrlEl = document.getElementById('og-url') as HTMLMetaElement | null;
        if (ogUrlEl) ogUrlEl.content = canonicalUrl;
        if (primaryColor) {
            document.documentElement.style.setProperty('--color-primary', hexToHsl(primaryColor));
        }
    }
  }, [settings, location.pathname]);

  if (settings == null || auth.currentUser === undefined) {
    return <PageLoader />;
  }

  return (
    <>
      <Toaster position="top-center" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/owner-view/:ownerId" element={<OwnerView />} />
          <Route path="/portal/:ownerId" element={<OwnerView />} />

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
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/owners" element={<Owners />} />
              <Route path="/owners/:ownerId/hub" element={<OwnersHub />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/maintenance" element={<Maintenance />} />

              {/* Finance Hub (Unified) */}
              <Route path="/financial/*" element={<ProtectedRoute capability="VIEW_FINANCIALS"><Finance /></ProtectedRoute>} />
              {Object.entries(LEGACY_FINANCIAL_ALIASES).map(([legacyPath, nextPath]) => (
                <Route key={legacyPath} path={legacyPath} element={<Navigate to={nextPath} replace />} />
              ))}

              {/* CRM & Growth */}
              <Route path="/leads" element={<Leads />} />
              <Route path="/communication" element={<CommunicationHub />} />
              <Route path="/lands" element={<Lands />} />
              <Route path="/commissions" element={<Commissions />} />
              
              {/* Analytics & Admin Hub */}
              <Route path="/reports" element={<Reports />} />
              <Route path="/smart-assistant" element={<ProtectedRoute capability="USE_SMART_ASSISTANT"><SmartAssistant /></ProtectedRoute>} />
              {auth.currentUser.role === 'ADMIN' && (
                <>
                  <Route path="/audit-log" element={<ProtectedRoute capability="VIEW_AUDIT_LOG"><AuditLog /></ProtectedRoute>} />
                  // Users: settings sub-module by design — see docs/architecture/ADR-001
                  <Route path="/settings/*" element={<ProtectedRoute capability="MANAGE_SETTINGS"><Settings /></ProtectedRoute>} />
                </>
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
