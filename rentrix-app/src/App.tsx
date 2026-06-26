import { AppProviders } from '@/app/providers';
import { AppRouterProvider } from '@/app/router';

export default function App() {
  return (
    <AppProviders>
      <AppRouterProvider />
    </AppProviders>
  );
}
