import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

export function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        void router.navigate({ to: '/', replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
        <CardDescription>استخدم بريد Supabase وكلمة المرور. كل المستخدمين المصادقين مديرون.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            البريد الإلكتروني
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required dir="ltr" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            كلمة المرور
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required dir="ltr" />
          </label>
          <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'جار الدخول...' : 'دخول'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
