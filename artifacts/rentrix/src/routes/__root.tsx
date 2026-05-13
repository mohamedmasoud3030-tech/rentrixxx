import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { AppCatchBoundary } from '@/components/error-boundary';

export function RootRouteComponent() {
  return (
    <AppCatchBoundary>
      <Outlet />
      <Toaster richColors position="top-left" dir="rtl" />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-left" /> : null}
    </AppCatchBoundary>
  );
}
