import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login-page';

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
  },
}));

describe('LoginPage runtime diagnostics', () => {
  it('renders a deployment warning when Supabase env is missing', () => {
    const html = renderToStaticMarkup(<LoginPage />);

    expect(html).toContain('يتعذر إكمال تسجيل الدخول بسبب إعدادات تشغيل ناقصة');
    expect(html).toContain('إعداد الاتصال بقاعدة البيانات غير مكتمل');
    expect(html).toContain('يلزم ضبط إعدادات Supabase في بيئة النشر');
  });
});
