import { createRootRoute, createRoute, redirect } from '@tanstack/react-router';
import { RouteErrorFallback } from '@/components/error-boundary';
import { NotFoundPage } from '@/app/not-found-page';
import { RootRouteComponent } from '@/routes/__root';
import { AuthRouteComponent } from '@/routes/_auth';
import { LoginRouteComponent } from '@/routes/_auth.login';
import { ProtectedRouteComponent } from '@/routes/_protected';
import { DashboardRouteComponent } from '@/routes/_protected.index';
import { PropertiesRouteComponent } from '@/routes/_protected.properties';
import { PropertyNewRouteComponent } from '@/routes/_protected.properties.new';
import { PropertyDetailRouteComponent } from '@/routes/_protected.properties.$propertyId';
import { PropertyEditRouteComponent } from '@/routes/_protected.properties.$propertyId.edit';
import { PeopleRouteComponent } from '@/routes/_protected.people';
import { PersonNewRouteComponent } from '@/routes/_protected.people.new';
import { PersonEditRouteComponent } from '@/routes/_protected.people.$personId.edit';
import { ContractsRouteComponent } from '@/routes/_protected.contracts';
import { FinancialsRouteComponent } from '@/routes/_protected.financials';
import { AccountingRouteComponent } from '@/routes/_protected.accounting';
import { ReportsRouteComponent } from '@/routes/_protected.reports';
import { SettingsRouteComponent } from '@/routes/_protected.settings';
import { supabase } from '@/integrations/supabase/client';

const rootRoute = createRootRoute({
  component: RootRouteComponent,
  errorComponent: RouteErrorFallback,
  notFoundComponent: NotFoundPage,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) throw redirect({ to: '/' });
  },
  component: AuthRouteComponent,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw redirect({ to: '/login' });
  },
  component: ProtectedRouteComponent,
});

const loginRoute = createRoute({ getParentRoute: () => authRoute, path: '/login', component: LoginRouteComponent, staticData: { title: 'تسجيل الدخول' } });
const dashboardRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/', component: DashboardRouteComponent, staticData: { title: 'لوحة التحكم' } });
const propertiesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/properties', component: PropertiesRouteComponent, staticData: { title: 'العقارات' } });
const propertyNewRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/properties/new', component: PropertyNewRouteComponent, staticData: { title: 'إضافة عقار' } });
const propertyDetailRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/properties/$propertyId', component: PropertyDetailRouteComponent, staticData: { title: 'تفاصيل العقار' } });
const propertyEditRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/properties/$propertyId/edit', component: PropertyEditRouteComponent, staticData: { title: 'تعديل عقار' } });
const peopleRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/people', component: PeopleRouteComponent, staticData: { title: 'الأشخاص' } });
const personNewRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/people/new', component: PersonNewRouteComponent, staticData: { title: 'إضافة شخص' } });
const personEditRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/people/$personId/edit', component: PersonEditRouteComponent, staticData: { title: 'تعديل شخص' } });
const contractsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/contracts', component: ContractsRouteComponent, staticData: { title: 'العقود' } });
const financialsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/financials', component: FinancialsRouteComponent, staticData: { title: 'المالية' } });
const accountingRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/accounting', component: AccountingRouteComponent, staticData: { title: 'المحاسبة' } });
const reportsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/reports', component: ReportsRouteComponent, staticData: { title: 'التقارير' } });
const settingsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/settings', component: SettingsRouteComponent, staticData: { title: 'الإعدادات' } });

export const routeTree = rootRoute.addChildren([
  authRoute.addChildren([loginRoute]),
  protectedRoute.addChildren([
    dashboardRoute,
    propertiesRoute,
    propertyNewRoute,
    propertyDetailRoute,
    propertyEditRoute,
    peopleRoute,
    personNewRoute,
    personEditRoute,
    contractsRoute,
    financialsRoute,
    accountingRoute,
    reportsRoute,
    settingsRoute,
  ]),
]);
