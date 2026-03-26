
import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/print/layout/Layout';
import Login from './pages/login';
import ChangePassword from './pages/change-password';
import OwnerPortal from './pages/owner-portal';
import OwnerView from './pages/owner-view';
import { Toaster } from 'react-hot-toast';

// Static imports for stability and to prevent Error #130
import Dashboard from './pages/dashboard';
import Properties from './pages/properties';
import People from './pages/people';
import Contracts from './pages/contracts';
import Finance from './pages/finance';
import Reports from './pages/reports';
// FIX: Changed import path to correct file
import Settings from './pages/settings';
import Leads from './pages/leads';
import CommunicationHub from './pages/communication-hub';
import LandsAndCommissions from './pages/lands-and-commissions';
import AuditLog from './pages/audit-log';
import SmartAssistant from './pages/smart-assistant';

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

const ROUTE_META: Record<string, { title: string; description: string }> = {
    '/': { title: 'لوحة التحكم', description: 'نظرة شاملة على أداء المحفظة العقارية والمؤشرات الرئيسية' },
    '/properties': { title: 'العقارات والوحدات', description: 'إدارة العقارات والوحدات والوحدات الفرعية المؤجرة' },
    '/people': { title: 'المستأجرون والملاك', description: 'إدارة بيانات المستأجرين والملاك والتواصل معهم' },
    '/contracts': { title: 'العقود', description: 'عرض وإدارة عقود الإيجار النشطة والمنتهية' },
    '/finance/invoices': { title: 'الفواتير', description: 'إدارة الفواتير الشهرية ومتابعة المدفوعات المتأخرة' },
    '/finance/receipts': { title: 'سندات القبض', description: 'سندات قبض المبالغ المدفوعة وتوزيعها على الفواتير' },
    '/finance/expenses': { title: 'المصروفات', description: 'تتبع وتصنيف مصروفات العقارات والوحدات' },
    '/finance/settlements': { title: 'التسويات', description: 'تسويات الملاك ومطابقة الحسابات' },
    '/finance/deposits': { title: 'الودائع', description: 'إدارة ودائع الضمان وتتبع حالتها' },
    '/finance/ledger': { title: 'دفتر الأستاذ', description: 'القيود المحاسبية والسجل المالي التفصيلي' },
    '/reports': { title: 'التقارير والتحليلات', description: 'تقارير الأداء المالي والإشغال والتحليلات الذكية' },
    '/leads': { title: 'العملاء المحتملون', description: 'إدارة العملاء المحتملين ومتابعة خط الفرص العقارية' },
    '/communication': { title: 'مركز التواصل', description: 'قوالب الرسائل والإشعارات للمستأجرين والملاك' },
    '/lands': { title: 'الأراضي والعمولات', description: 'إدارة صفقات الأراضي وعمولات الوسطاء العقاريين' },
    '/settings': { title: 'الإعدادات', description: 'إعدادات النظام والمظهر والمستخدمين والتكاملات' },
    '/audit-log': { title: 'سجل المراجعة', description: 'سجل شامل لجميع العمليات والأحداث في النظام' },
    '/smart-assistant': { title: 'المساعد الذكي', description: 'مساعد ذكاء اصطناعي لتحليل البيانات والإجابة على استفساراتك' },
};

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
            : Object.keys(ROUTE_META).find(k => k !== '/' && location.pathname.startsWith(k)) || '/';
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
              <Route path="/smart-assistant" element={<SmartAssistant />} />
              {auth.currentUser.role === 'ADMIN' && (
                <>
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/settings/*" element={<Settings />} />
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