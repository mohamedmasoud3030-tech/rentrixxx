import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';
import { AppCatchBoundary } from '@/components/error-boundary';
import { getAppLanguageState } from '@/lib/i18n';

export function RootRouteComponent() {
  return (
    <AppCatchBoundary>
      <Outlet />
      <Toaster richColors position="top-right" dir={getAppLanguageState().direction} />
      {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
    </AppCatchBoundary>
  );
}
