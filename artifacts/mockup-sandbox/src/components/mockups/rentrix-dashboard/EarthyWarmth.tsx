import { Search, Building2, Users, FileText, Home, Percent, AlertTriangle, Wrench, TrendingUp, TrendingDown, Bell, Moon, Menu } from "lucide-react";

const stats = [
  { label: "العقارات", value: "5", icon: Building2, bg: "bg-amber-100", icon_color: "text-amber-700" },
  { label: "الوحدات", value: "28", icon: Home, bg: "bg-orange-100", icon_color: "text-orange-700" },
  { label: "الشاغرة", value: "4", icon: Home, bg: "bg-stone-100", icon_color: "text-stone-600" },
  { label: "الإشغال", value: "85.7%", icon: Percent, bg: "bg-lime-100", icon_color: "text-lime-700" },
  { label: "المستأجرون", value: "24", icon: Users, bg: "bg-teal-100", icon_color: "text-teal-700" },
  { label: "العقود النشطة", value: "22", icon: FileText, bg: "bg-amber-100", icon_color: "text-amber-700" },
];

const financials = [
  {
    label: "إيرادات الشهر", value: "12,500", sub: "ر.ع", trend: "+8.2%", up: true,
    gradient: "from-emerald-400 to-teal-500",
    icon: TrendingUp,
  },
  {
    label: "مصروفات الشهر", value: "2,340", sub: "ر.ع", trend: "-3.1%", up: false,
    gradient: "from-rose-400 to-orange-400",
    icon: TrendingDown,
  },
  {
    label: "صافي الشهر", value: "10,160", sub: "ر.ع", trend: "+11.4%", up: true,
    gradient: "from-amber-400 to-yellow-500",
    icon: TrendingUp,
  },
  {
    label: "رصيد الخزنة", value: "38,420", sub: "ر.ع", trend: "مجمّع", up: true,
    gradient: "from-orange-400 to-amber-500",
    icon: Building2,
  },
];

const contracts = [
  { tenant: "محمد الراشد", unit: "A-101", days: 12 },
  { tenant: "سالم البلوشي", unit: "B-204", days: 28 },
  { tenant: "خالد العمري", unit: "C-315", days: 45 },
];

const invoices = [
  { tenant: "أحمد السعدي", unit: "D-102", amount: "380 ر.ع" },
  { tenant: "يوسف الحارثي", unit: "A-203", amount: "520 ر.ع" },
];

export function EarthyWarmth() {
  return (
    <div className="min-h-screen font-['Cairo']" style={{ background: "#fdf6ed" }} dir="rtl">
      {/* Topbar */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ background: "#fff8f0", borderBottom: "1px solid #e8d5b7" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#c2813a,#d4a055)" }}>R</div>
          <span className="font-bold text-amber-900 text-sm">Rentrix</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">● متصل</span>
          <Bell size={17} className="text-amber-400" />
          <Moon size={17} className="text-amber-400" />
          <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: "#c2813a" }}>Y</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        {/* Header */}
        <div className="text-right">
          <p className="text-xs text-amber-500 tracking-wide mb-1">أهلاً وسهلاً</p>
          <h1 className="text-2xl font-bold" style={{ color: "#5a3310" }}>لوحة التحكم</h1>
          <p className="text-sm text-amber-700 mt-0.5">مرحباً بك في مشاريع جودة الانطلاقة</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
          <input
            className="w-full border-2 rounded-2xl py-3 pr-11 pl-4 text-sm placeholder:text-amber-300 focus:outline-none"
            style={{ background: "#fff8f0", borderColor: "#e8d5b7", color: "#5a3310" }}
            placeholder="ابحث عن مستأجر، أو وحدة..."
            readOnly
          />
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl p-4 text-center shadow-sm" style={{ background: "#fff8f0", border: "1px solid #e8d5b7" }}>
              <div className={`w-9 h-9 ${s.bg} rounded-xl mx-auto mb-2 flex items-center justify-center`}>
                <s.icon size={17} className={s.icon_color} />
              </div>
              <p className="text-xl font-bold" style={{ color: "#5a3310" }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a07040" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {financials.map((f) => (
            <div key={f.label} className={`bg-gradient-to-br ${f.gradient} rounded-2xl p-5 text-white shadow-md`}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-white/80">{f.label}</p>
                <f.icon size={16} className="text-white/60" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{f.value}</span>
                <span className="text-xs text-white/70">{f.sub}</span>
              </div>
              <p className="text-xs mt-2 text-white/80 font-medium">{f.trend}</p>
            </div>
          ))}
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#fff1e6", border: "1px solid #f5c98a" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff8f0" }}>
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#a07040" }}>فواتير متأخرة</p>
              <p className="text-2xl font-bold" style={{ color: "#5a3310" }}>3</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#fff8e6", border: "1px solid #f5d98a" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff8f0" }}>
              <FileText size={20} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#a07040" }}>عقود تنتهي قريباً</p>
              <p className="text-2xl font-bold" style={{ color: "#5a3310" }}>5</p>
            </div>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#f0f9f4", border: "1px solid #b7ddc5" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff8f0" }}>
              <Wrench size={20} className="text-teal-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "#a07040" }}>طلبات صيانة</p>
              <p className="text-2xl font-bold" style={{ color: "#5a3310" }}>2</p>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#fff8f0", border: "1px solid #e8d5b7" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #e8d5b7" }}>
              <FileText size={14} className="text-amber-500" />
              <h3 className="text-sm font-bold" style={{ color: "#5a3310" }}>عقود تنتهي قريباً</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#f0e0c4" }}>
              {contracts.map((c, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#5a3310" }}>{c.tenant}</p>
                    <p className="text-xs" style={{ color: "#a07040" }}>{c.unit}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.days <= 15 ? "bg-rose-100 text-rose-600" : c.days <= 30 ? "bg-amber-100 text-amber-600" : "bg-stone-100 text-stone-500"}`}>
                    {c.days} يوم
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#fff8f0", border: "1px solid #e8d5b7" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #e8d5b7" }}>
              <AlertTriangle size={14} className="text-rose-400" />
              <h3 className="text-sm font-bold" style={{ color: "#5a3310" }}>فواتير متأخرة</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#f0e0c4" }}>
              {invoices.map((inv, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#5a3310" }}>{inv.tenant}</p>
                    <p className="text-xs" style={{ color: "#a07040" }}>{inv.unit}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-500">{inv.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
