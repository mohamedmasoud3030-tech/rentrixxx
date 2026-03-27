import { Search, Building2, Users, FileText, Banknote, TrendingUp, TrendingDown, AlertTriangle, Wrench, Home, Percent, DollarSign, Bell, LogOut, Moon, Menu } from "lucide-react";

const stats = [
  { label: "العقارات", value: "5", icon: Building2, color: "text-slate-600" },
  { label: "الوحدات", value: "28", icon: Home, color: "text-slate-600" },
  { label: "الشاغرة", value: "4", icon: Home, color: "text-slate-600" },
  { label: "الإشغال", value: "85.7%", icon: Percent, color: "text-slate-600" },
  { label: "المستأجرون", value: "24", icon: Users, color: "text-slate-600" },
  { label: "العقود النشطة", value: "22", icon: FileText, color: "text-slate-600" },
];

const financials = [
  { label: "إيرادات الشهر", value: "12,500", sub: "ر.ع", trend: "+8.2%", up: true, bg: "bg-slate-800", border: "border-l-4 border-l-cyan-400" },
  { label: "مصروفات الشهر", value: "2,340", sub: "ر.ع", trend: "-3.1%", up: false, bg: "bg-slate-800", border: "border-l-4 border-l-rose-400" },
  { label: "صافي الشهر", value: "10,160", sub: "ر.ع", trend: "+11.4%", up: true, bg: "bg-slate-800", border: "border-l-4 border-l-emerald-400" },
  { label: "رصيد الخزنة", value: "38,420", sub: "ر.ع", trend: "مجمّع", up: true, bg: "bg-slate-800", border: "border-l-4 border-l-amber-400" },
];

const alerts = [
  { label: "فواتير متأخرة", value: "3", icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50 border-rose-100" },
  { label: "عقود تنتهي قريباً", value: "5", icon: FileText, color: "text-amber-500", bg: "bg-amber-50 border-amber-100" },
  { label: "طلبات صيانة", value: "2", icon: Wrench, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" },
];

const contracts = [
  { tenant: "محمد الراشد", unit: "A-101", days: 12 },
  { tenant: "سالم البلوشي", unit: "B-204", days: 28 },
  { tenant: "خالد العمري", unit: "C-315", days: 45 },
];

const invoices = [
  { tenant: "أحمد السعدي", unit: "D-102", days: 15, amount: "380 ر.ع" },
  { tenant: "يوسف الحارثي", unit: "A-203", days: 32, amount: "520 ر.ع" },
];

export function CorporateCalm() {
  return (
    <div className="min-h-screen bg-slate-50 font-['Cairo']" dir="rtl">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">R</div>
          <span className="font-bold text-slate-800 text-sm">Rentrix</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md font-medium">● متصل</span>
          <Bell size={18} className="text-slate-400" />
          <Moon size={18} className="text-slate-400" />
          <Menu size={18} className="text-slate-400" />
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">Y</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">نظام إدارة العقارات</p>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">لوحة التحكم</h1>
            <p className="text-sm text-slate-500 mt-0.5">مرحباً بك في مشاريع جودة الانطلاقة</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-400">الربع الثاني 2026</p>
            <p className="text-sm font-semibold text-slate-600">مارس 2026</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full border border-slate-200 bg-white rounded-lg py-3 pr-11 pl-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 shadow-sm"
            placeholder="ابحث عن مستأجر، أو وحدة..."
            readOnly
          />
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-sm">
              <s.icon size={18} className={`mx-auto mb-2 ${s.color}`} />
              <p className="text-xl font-bold text-slate-800 tabular-nums">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {financials.map((f) => (
            <div key={f.label} className={`${f.bg} ${f.border} rounded-lg p-5 text-white shadow-md`}>
              <p className="text-xs text-slate-300 mb-3">{f.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums tracking-tight">{f.value}</span>
                <span className="text-xs text-slate-400">{f.sub}</span>
              </div>
              <div className={`text-xs mt-2 font-medium ${f.up ? "text-emerald-400" : "text-rose-400"}`}>
                {f.up ? <TrendingUp size={12} className="inline ml-1" /> : <TrendingDown size={12} className="inline ml-1" />}
                {f.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-3 gap-4">
          {alerts.map((a) => (
            <div key={a.label} className={`${a.bg} border rounded-lg p-4 flex items-center gap-4`}>
              <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0`}>
                <a.icon size={18} className={a.color} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{a.label}</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{a.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tables row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Expiring contracts */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">عقود تنتهي قريباً</h3>
              <FileText size={14} className="text-slate-400" />
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-400">
                <th className="px-4 py-2 text-right font-medium">المستأجر</th>
                <th className="px-4 py-2 text-right font-medium">الوحدة</th>
                <th className="px-4 py-2 text-right font-medium">الأيام</th>
              </tr></thead>
              <tbody>
                {contracts.map((c, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{c.tenant}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{c.unit}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.days <= 15 ? "bg-rose-100 text-rose-600" : c.days <= 30 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                        {c.days} يوم
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Overdue invoices */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">فواتير متأخرة</h3>
              <AlertTriangle size={14} className="text-rose-400" />
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-400">
                <th className="px-4 py-2 text-right font-medium">المستأجر</th>
                <th className="px-4 py-2 text-right font-medium">الوحدة</th>
                <th className="px-4 py-2 text-right font-medium">المبلغ</th>
              </tr></thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{inv.tenant}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{inv.unit}</td>
                    <td className="px-4 py-2.5 font-bold text-rose-600 text-xs">{inv.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
