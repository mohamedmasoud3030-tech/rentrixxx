import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Lock } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth, settings } = useApp();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const res = await auth.login(username, password);
    if (!res.ok) {
      setError(res.msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden border border-border">
        
        {/* Form Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-text mb-8">مرحباً بعودتك!</h1>

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="اسم المستخدم"
                        className="pr-10"
                        required
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="كلمة المرور"
                        className="pr-10"
                        required
                    />
                </div>
                
                {error && <p className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded-md">{error}</p>}
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn btn-primary py-3 text-base"
                >
                    {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </button>

                <div className="text-center text-sm text-text-muted mt-8 pt-4 border-t border-border">
                     <p className="font-bold">تطوير: Mohamed Masoud</p>
                     <p className="font-mono mt-1" dir="ltr">+968 9192 8186 / +20 121 210 1073</p>
                </div>
            </form>
        </div>

        {/* Branding Side */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-yellow-600 dark:to-yellow-800 text-white text-center">
            <h1 className="text-6xl font-black mb-4">Rentrix</h1>
            <p className="text-lg font-bold mb-3">{settings.general.company.name || 'Rentrix'}</p>
            <p className="max-w-sm leading-relaxed opacity-90 text-sm">
                نظام إدارة مؤسسات شامل لإدارة العقارات، مصمم خصيصا لمؤسسة مشاريع جودة الانطلاقة
            </p>
            <p className="mt-2 max-w-sm leading-relaxed opacity-90 text-sm">
                إدارة السيد \ يعقوب فاضل الخصيبي
            </p>
        </div>
        
      </div>
    </div>
  );
};

export default Login;