import { Outlet } from '@tanstack/react-router';

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))] p-6" dir="rtl">
      <Outlet />
    </main>
  );
}
