import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { DocumentHeaderInline } from '../shared/DocumentHeader';
import { Download, Printer } from 'lucide-react';

export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export const ReportPrintableContent: React.FC<{ title: string; date: string; children: React.ReactNode }> = ({ title, date, children }) => {
  const { settings } = useApp();
  const company = settings.general.company;
  const logo = settings.appearance?.logoDataUrl;
  return (
    <div className="print-doc" dir="rtl">
      <div className="print-doc__header">
        <DocumentHeaderInline company={company} logoUrl={logo} docTitle={title} docDate={date} />
      </div>
      <div className="print-doc__body">
        {children}
      </div>
      <div className="print-doc__footer">
        <div className="flex justify-between items-center text-xs">
          <span>تم إنشاء المستند بواسطة Rentrix</span>
          <span>{company.name}</span>
        </div>
      </div>
    </div>
  );
};

export const MiniKpi: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
    <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text" dir="ltr">{value}</p>
    </div>
  </div>
);

export const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
    <h3 className="text-lg font-bold flex items-center gap-2">{icon} {title}</h3>
    {children}
  </div>
);

export const ActionBar: React.FC<{ onPrint: () => void; onExport?: () => void; children?: React.ReactNode }> = ({ onPrint, onExport, children }) => (
  <div className="flex flex-wrap gap-3 items-end mb-6">
    {children}
    <div className="flex gap-2 mr-auto">
      <button onClick={onPrint} className="btn btn-primary flex items-center gap-2 text-sm"><Printer size={15} /> طباعة</button>
      {onExport && <button onClick={onExport} className="btn btn-secondary flex items-center gap-2 text-sm"><Download size={15} /> PDF</button>}
    </div>
  </div>
);
