import { useState, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import {
  Building2,
  Mail,
  Globe,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);
  const { auth, settings } = useApp();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsLoading(true);
    setError("");
    try {
      const res = await auth.login(email, password);
      if (!res.ok) {
        setError(res.msg);
      }
    } catch {
      setError("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden"
      dir="rtl"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-5xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/40 backdrop-blur-sm bg-surface-container-low/95">
          {/* Left Side - Form */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-bold text-primary">Rentrix-Egy</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black rx-gradient-text mb-3">
                مرحباً بعودتك
              </h1>
              <p className="text-on-surface-variant text-lg">
                سجل الدخول لإدارة عقاراتك بكفاءة
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div className="group">
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold text-text mb-2"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pr-12 pl-4 py-3 bg-background border border-outline-variant/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-text-muted/50 disabled:opacity-50"
                    required
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="group">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-text mb-2"
                >
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted group-focus-within:text-primary transition-colors" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3 bg-background border border-outline-variant/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-text-muted/50 disabled:opacity-50"
                    required
                    dir="ltr"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <span className="text-red-600 dark:text-red-400 font-medium text-sm">
                    {error}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || auth.isInitializing || !email || !password}
                className="w-full relative py-3 px-4 rx-gradient-btn font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 active:scale-95 flex items-center justify-center gap-2 group mt-2"
              >
                <span
                  className={`transition-all ${isLoading ? "opacity-0" : "opacity-100"}`}
                >
                  تسجيل الدخول
                </span>
                {isLoading && (
                  <div className="absolute flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري الدخول...</span>
                  </div>
                )}
              </button>

              {/* Footer */}
              <div className="pt-6 border-t border-border/30">
                <div className="text-center space-y-2">
                  <p className="text-xs text-on-surface-variant/70">
                    نظام إدارة العقارات المتقدم
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                    <span> آمن تماماً</span>
                    <span className="text-border">•</span>
                    <span> متاح على الويب والسطح المكتب</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Side - Branding */}
          <div className="hidden md:flex flex-col items-center justify-center p-12 lg:p-16 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/60 dark:from-amber-600/90 dark:via-amber-700/80 dark:to-amber-800/60"></div>

            {/* Decorative elements */}
            <div className="absolute top-10 right-10 w-20 h-20 bg-white/10 rounded-3xl rotate-45 blur-xl"></div>
            <div className="absolute bottom-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

            <div className="relative z-10 text-center space-y-6">
              {/* Logo area */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30">
                <Building2 className="w-10 h-10 text-white animate-pulse" />
              </div>

              <div>
                <h2 className="text-5xl lg:text-6xl font-black text-white mb-2">
                  Rentrix
                </h2>
                <p className="text-lg font-bold text-white/90">
                  نظام إدارة العقارات
                </p>
              </div>

              {/* Features */}
              <div className="pt-4 space-y-3">
                {[
                  " إدارة عقارات شاملة",
                  " تقارير مالية متقدمة",
                  " إدارة المستأجرين",
                  " نظام محاسبة مزدوج الدخول",
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-white/90 justify-center"
                  >
                    <CheckCircle2
                      size={18}
                      className="text-white/70 flex-shrink-0"
                    />
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="pt-6 border-t border-white/20 max-w-xs">
                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  النظام السحابي المتكامل لإدارة الأملاك، الفواتير، العقود،
                  والصيانة في مكان واحد.
                </p>

                {/* Developer Info */}
                <div className="space-y-2 text-xs text-white/70">
                  <p className="font-semibold text-white">
                    Developed by Mohamed Masoud
                  </p>
                  <p className="flex items-center gap-1 justify-center hover:text-white transition-colors">
                    <Mail size={12} />
                    Mohamedms.oud@outlook.com
                  </p>
                  <p className="flex items-center gap-1 justify-center hover:text-white transition-colors">
                    <Globe size={12} />
                    968 91928186+ 201212101003+
                  </p>
                  <p>Version 2.8.0  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile branding info */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-primary/20 to-transparent border-t border-border/30 text-center text-xs text-on-surface-variant">
        <p className="font-semibold">
          Rentrix-Egy- نظام إدارة العقارات المتقدم
        </p>
      </div>
    </div>
  );
};

export default Login;
