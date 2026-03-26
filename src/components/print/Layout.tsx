import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import SmartAssistant from '../shared/SmartAssistant';
import { useApp } from '../../contexts/AppContext';
import { AlertTriangle } from 'lucide-react';

const ReadOnlyBanner: React.FC = () => {
    const { isReadOnly } = useApp();
    if (!isReadOnly) return null;

    return (
        <div className="bg-red-600 text-white text-center py-2 px-4 flex items-center justify-center gap-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-bold">النظام في وضع القراءة فقط. لا يمكن إجراء أي تغييرات.</span>
        </div>
    );
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Topbar setSidebarOpen={setSidebarOpen} />
        <ReadOnlyBanner />
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
        <Footer />
        <SmartAssistant />
      </div>
    </div>
  );
};

export default Layout;