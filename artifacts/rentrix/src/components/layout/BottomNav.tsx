import type { LucideIcon } from 'lucide-react';
import { ClipboardList, FileText, LayoutDashboard, ReceiptText, WalletCards } from 'lucide-react';
import { Link } from '@tanstack/react-router';

type BottomNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const bottomNavItems: BottomNavItem[] = [
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
    >
      <div className="grid h-16 grid-cols-5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors [&.active]:text-primary"
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-bold leading-none">{labelFor(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
