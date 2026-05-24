import type { LucideIcon } from 'lucide-react';
import { ClipboardList, FileText, LayoutDashboard, ReceiptText, WalletCards } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

type BottomNavItem = Readonly<{
  to: string;
  label: string;
  icon: LucideIcon;
}>;

const bottomNavItems: readonly BottomNavItem[] = [
  { to: '/', label: 'dashboard', icon: LayoutDashboard },
  { to: '/contracts', label: 'contracts', icon: FileText },
  { to: '/financials', label: 'financials', icon: WalletCards },
  { to: '/invoices', label: 'invoices', icon: ReceiptText },
  { to: '/arrears', label: 'arrears', icon: ClipboardList },
];

export function BottomNav({ labelFor }: Readonly<{ labelFor: (key: string) => string }>) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={labelFor('primaryNavigation')}
    >
      <div className="grid h-16 grid-cols-5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const label = labelFor(item.label);
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              aria-label={label}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-muted-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                '[&.active]:text-primary',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate text-[10px] font-bold leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
