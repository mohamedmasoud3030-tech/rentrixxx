import { Search, Building2, Users, FileText, Home, Percent, AlertTriangle, Wrench, TrendingUp, TrendingDown, Bell, Moon, Menu, DollarSign, Activity } from "lucide-react";

const stats = [
  { label: "العقارات", value: "5", icon: Building2, glow: "#22d3ee", accent: "text-cyan-400" },
  { label: "الوحدات", value: "28", icon: Home, glow: "#22d3ee", accent: "text-cyan-400" },
  { label: "الشاغرة", value: "4", icon: Home, glow: "#f97316", accent: "text-orange-400" },
  { label: "الإشغال", value: "85.7%", icon: Percent, glow: "#10b981", accent: "text-emerald-400" },
  { label: "المستأجرون", value: "24", icon: Users, glow: "#a78bfa", accent: "text-violet-400" },
  { label: "العقود النشطة", value: "22", icon: FileText, glow: "#10b981", accent: "text-emerald-400" },
];

const financials = [
  { label: "إيرادات الشهر", value: "12,500", sub: "ر.ع", trend: "+8.2%", up: true, accent: "#10b981", glow: "rgba(16,185,129,0.15)" },
  { label: "مصروفات الشهر", value: "2,340", sub: "ر.ع", trend: "-3.1%", up: false, accent: "#f43f5e", glow: "rgba(244,63,94,0.15)" },
  { label: "صافي الشهر", value: "10,160", sub: "ر.ع", trend: "+11.4%", up: true, accent: "#22d3ee", glow: "rgba(34,211,238,0.15)" },
  { label: "رصيد الخزنة", value: "38,420", sub: "ر.ع", trend: "مجمّع", up: true, accent: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
];

const contracts = [
  { tenant: "محمد الراشد", unit: "A-101", days: 12, severity: "high" },
  { tenant: "سالم البلوشي", unit: "B-204", days: 28, severity: "mid" },
  { tenant: "خالد العمري", unit: "C-315", days: 45, severity: "low" },
];

const invoices = [
  { tenant: "أحمد السعدي", unit: "D-102", amount: "380 ر.ع" },
  { tenant: "يوسف الحارثي", unit: "A-203", amount: "520 ر.ع" },
];

export function DarkModern() {
  return (
    <div className="min-h-screen font-['Cairo']" style={{ background: "#0d1117" }} dir="rtl">
      {/* Topbar */}
      <div className="px-6 py-3 flex items-center justify-between" style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#22d3ee,#6366f1)" }}>R</div>
          <span className="font-bold text-white text-sm">Rentrix</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>● متصل</span>
          <Bell size={17} className="text-gray-500" />
          <Moon size={17} className="text-gray-500" />
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#22d3ee,#6366f1)" }}>Y</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#22d3ee" }}>{'> نظام_إدارة_العقارات'}</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">لوحة التحكم</h1>
            <p className="text-sm mt-0.5" style={{ color: "#8b949e" }}>مشاريع جودة الانطلاقة</p>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <Activity size={12} style={{ color: "#10b981" }} />
              <span className="text-xs" style={{ color: "#8b949e" }}>مارس 2026</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8b949e" }} />
          <input
            className="w-full rounded-lg py-3 pr-11 pl-4 text-sm focus:outline-none"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#c9d1d9" }}
            placeholder="ابحث عن مستأجر، أو وحدة..."
            readOnly
          />
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-6 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl p-4 text-center relative overflow-hidden"
              style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <div className="absolute inset-0 opacity-5 rounded-xl" style={{ background: `radial-gradient(circle at 50% 0%, ${s.glow}, transparent 70%)` }} />
              <s.icon size={17} className={`mx-auto mb-2 ${s.accent}`} />
              <p className="text-xl font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8b949e" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {financials.map((f) => (
            <div key={f.label} className="rounded-xl p-5 relative overflow-hidden"
              style={{ background: "#161b22", border: `1px solid ${f.accent}33` }}>
              <div className="absolute inset-0 rounded-xl" style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.glow}, transparent 70%)` }} />
              <div className="relative">
                <p className="text-xs mb-3" style={{ color: "#8b949e" }}>{f.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white tabular-nums tracking-tight">{f.value}</span>
                  <span className="text-xs" style={{ color: "#8b949e" }}>{f.sub}</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {f.up ? <TrendingUp size={12} style={{ color: f.accent }} /> : <TrendingDown size={12} style={{ color: f.accent }} />}
                  <span className="text-xs font-mono font-bold" style={{ color: f.accent }}>{f.trend}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "فواتير متأخرة", value: "3", icon: AlertTriangle, color: "#f43f5e", glow: "rgba(244,63,94,0.1)" },
            { label: "عقود تنتهي قريباً", value: "5", icon: FileText, color: "#f59e0b", glow: "rgba(245,158,11,0.1)" },
            { label: "طلبات صيانة", value: "2", icon: Wrench, color: "#22d3ee", glow: "rgba(34,211,238,0.1)" },
          ].map((a) => (
            <div key={a.label} className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: "#161b22", border: `1px solid ${a.color}33`, boxShadow: `0 0 20px ${a.glow}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${a.color}15`, border: `1px solid ${a.color}33` }}>
                <a.icon size={18} style={{ color: a.color }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#8b949e" }}>{a.label}</p>
                <p className="text-2xl font-bold text-white tabular-nums">{a.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tables */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #30363d", background: "#0d1117" }}>
              <FileText size={14} style={{ color: "#f59e0b" }} />
              <h3 className="text-sm font-bold" style={{ color: "#e6edf3" }}>عقود تنتهي قريباً</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#30363d" }}>
              {contracts.map((c, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#e6edf3" }}>{c.tenant}</p>
                    <p className="text-xs font-mono" style={{ color: "#8b949e" }}>{c.unit}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono"
                    style={{
                      background: c.severity === "high" ? "rgba(244,63,94,0.15)" : c.severity === "mid" ? "rgba(245,158,11,0.15)" : "rgba(99,102,241,0.15)",
                      color: c.severity === "high" ? "#f43f5e" : c.severity === "mid" ? "#f59e0b" : "#818cf8",
                      border: `1px solid ${c.severity === "high" ? "#f43f5e33" : c.severity === "mid" ? "#f59e0b33" : "#818cf833"}`,
                    }}>
                    {c.days}d
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #30363d", background: "#0d1117" }}>
              <AlertTriangle size={14} style={{ color: "#f43f5e" }} />
              <h3 className="text-sm font-bold" style={{ color: "#e6edf3" }}>فواتير متأخرة</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#30363d" }}>
              {invoices.map((inv, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#e6edf3" }}>{inv.tenant}</p>
                    <p className="text-xs font-mono" style={{ color: "#8b949e" }}>{inv.unit}</p>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: "#f43f5e" }}>{inv.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
