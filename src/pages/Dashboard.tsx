import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Building2, Home, FileText, Wallet,
  ArrowUpRight, ArrowDownRight, AlertCircle, Wrench
} from 'lucide-react';
import Card from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { db } = useApp();

  const stats = useMemo(() => {
    const contracts = db.contracts || [];
    const units = db.units || [];
    const properties = db.properties || [];
    const invoices = db.invoices || [];

    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    const occupiedUnits = units.filter(u => u.status === 'RENTED').length;
    const totalUnits = units.length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    
    const totalInvoices = invoices.reduce((sum, i) => sum + i.amount, 0);

    return [
      {
        title: "العقارات",
        value: properties.length.toString(),
        icon: Building2,
        trend: "+2 من الشهر الماضي",
        trendUp: true,
      },
      {
        title: "الوحدات المؤجرة",
        value: `${occupiedUnits}/${totalUnits}`,
        icon: Home,
        trend: `${occupancyRate}% نسبة الإشغال`,
        trendUp: occupancyRate > 80,
      },
      {
        title: "العقود النشطة",
        value: activeContracts.toString(),
        icon: FileText,
        trend: "جميعها سارية",
        trendUp: true,
      },
      {
        title: "إجمالي الفواتير",
        value: formatCurrency(totalInvoices, 'SAR'),
        icon: Wallet,
        trend: "+12% من الشهر الماضي",
        trendUp: true,
      }
    ];
  }, [db]);

  const contracts = db.contracts || [];
  const invoices = db.invoices || [];
  const maintenance = db.maintenanceRecords || [];
  const units = db.units || [];
  const recentContracts = contracts.slice(0, 5);

  const chartData = [
    { name: 'يناير', value: 45000 },
    { name: 'فبراير', value: 52000 },
    { name: 'مارس', value: 38000 },
    { name: 'أبريل', value: 65000 },
    { name: 'مايو', value: 48000 },
    { name: 'يونيو', value: 55000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-text mb-2">لوحة القيادة</h1>
        <p className="text-text-muted">نظرة عامة على أداء محفظتك العقارية</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-5 hover:shadow-lg transition-all duration-300 border border-border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-medium text-text-muted">{stat.title}</h3>
              <div className="p-2 bg-primary/10 rounded-lg">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-text mb-2">{stat.value}</div>
            <div className="flex items-center text-xs gap-1">
              {stat.trendUp ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className={stat.trendUp ? "text-emerald-500" : "text-red-500"}>
                {stat.trend}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 p-5 border border-border">
          <h3 className="font-bold text-text mb-4">الفواتير الشهرية</h3>
          <div className="h-80 overflow-hidden" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [formatCurrency(v, 'SAR'), '']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={`c-${i}`} fill={i === chartData.length - 1 ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Alerts */}
        <Card className="p-5 border border-border">
          <h3 className="font-bold text-text mb-4">تنبيهات هامة</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Expired Contracts */}
            {contracts.filter(c => c.status === 'ENDED').slice(0, 2).map((c, i) => (
              <div key={`c-${i}`} className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-amber-500/10 flex-shrink-0">
                  <FileText className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">عقد منتهي</p>
                  <p className="text-xs text-text-muted truncate">#{c.id?.slice(0, 8)}</p>
                </div>
              </div>
            ))}

            {/* Unpaid Invoices */}
            {invoices.filter(i => i.status === 'UNPAID').slice(0, 2).map((inv, i) => (
              <div key={`inv-${i}`} className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-red-500/10 flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">فاتورة غير مدفوعة</p>
                  <p className="text-xs text-text-muted truncate">{formatCurrency(inv.amount, 'SAR')}</p>
                </div>
              </div>
            ))}

            {/* Maintenance */}
            {maintenance.filter(m => m.status === 'IN_PROGRESS').slice(0, 2).map((m, i) => (
              <div key={`mnt-${i}`} className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-blue-500/10 flex-shrink-0">
                  <Wrench className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">صيانة جاريـة</p>
                  <p className="text-xs text-text-muted truncate">{m.description}</p>
                </div>
              </div>
            ))}

            {/* Vacant Units */}
            {units.filter(u => u.status === 'AVAILABLE').slice(0, 2).map((u, i) => (
              <div key={`u-${i}`} className="flex gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-blue-500/10 flex-shrink-0">
                  <Home className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">وحدة شاغرة</p>
                  <p className="text-xs text-text-muted truncate">{u.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Contracts Table */}
      <Card className="p-5 border border-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-text">أحدث العقود</h3>
          <button className="text-sm text-primary hover:text-primary/80">عرض الكل</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 font-medium text-text-muted">رقم العقد</th>
                <th className="pb-3 font-medium text-text-muted">المستأجر</th>
                <th className="pb-3 font-medium text-text-muted">تاريخ البداية</th>
                <th className="pb-3 font-medium text-text-muted">تاريخ النهاية</th>
                <th className="pb-3 font-medium text-text-muted">الإيجار</th>
                <th className="pb-3 font-medium text-text-muted">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {recentContracts.map((contract, i) => {
                let statusColor = "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
                if (contract.status === "ACTIVE") statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                else if (contract.status === "ENDED") statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                
                return (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium text-primary">#{contract.no || contract.id?.slice(0, 8)}</td>
                    <td className="py-3 text-text">{contract.tenantId}</td>
                    <td className="py-3 text-text-muted">{formatDate(contract.start)}</td>
                    <td className="py-3 text-text-muted">{formatDate(contract.end)}</td>
                    <td className="py-3 font-medium text-text">{formatCurrency(contract.rent || 0, 'SAR')}</td>
                    <td className="py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                        {contract.status === 'ACTIVE' ? 'نشط' : 'منتهي'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
