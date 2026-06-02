import { Link } from '@tanstack/react-router';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups, quickLinks, type QuickLinkRoute } from './app-nav-items';

export type SharedLabel = (key: string) => string;

export function NavigationLinks({
  expanded,
  sharedLabel,
  onNavigate,
}: Readonly<{ expanded: boolean; sharedLabel: SharedLabel; onNavigate?: () => void }>) {
  return (
    <div className="space-y-5">
      {navGroups.map(([sectionTitle, items]) => (
        <section key={sectionTitle} className="space-y-1">
          {expanded ? (
            <p className="px-3 pb-1 text-[10px] font-black tracking-[0.14em] text-sidebar-foreground/45">
              {sectionTitle}
            </p>
          ) : null}
          {items.map(([to, labelKey, description, Icon]) => (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              aria-label={sharedLabel(labelKey)}
              title={expanded ? undefined : sharedLabel(labelKey)}
              activeOptions={{ exact: to === '/' }}
              className="group flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sidebar-foreground transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-sidebar-accent hover:text-white [&.active]:border-white/15 [&.active]:bg-primary [&.active]:text-primary-foreground"
            >
              <Icon className="size-5 shrink-0 transition-transform group-hover:scale-110" />
              {expanded ? (
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-black">{sharedLabel(labelKey)}</span>
                  <span className="block truncate text-[10px] font-bold text-sidebar-foreground/50 group-hover:text-white/70">
                    {description}
                  </span>
                </span>
              ) : null}
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}

export function WorkspaceCard({
  onQuickLink,
  compact = false,
}: Readonly<{ onQuickLink: (to: QuickLinkRoute) => void; compact?: boolean }>) {
  return (
    <section className={cn('rounded-2xl border border-white/10 bg-white/[0.06] p-3', compact ? 'mt-3' : 'mt-5')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-white">مركز العمل</p>
          <p className="text-[10px] font-bold text-sidebar-foreground/55">اختصارات عملية لإنجاز أسرع</p>
        </div>
        <Sparkles className="size-4 text-primary" />
      </div>
      {quickLinks.map(([to, title, Icon]) => (
        <button
          key={to}
          type="button"
          onClick={() => onQuickLink(to)}
          className="group flex w-full items-center gap-2 rounded-xl px-2 py-2 text-right text-[11px] font-black text-sidebar-foreground/80 transition hover:bg-white/10 hover:text-white"
        >
          <Icon className="size-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
          <span>{title}</span>
          <Plus className="mr-auto size-3.5 shrink-0 opacity-50" />
        </button>
      ))}
    </section>
  );
}

export function MobileBottomNav({ sharedLabel }: Readonly<{ sharedLabel: SharedLabel }>) {
  const mobileItems = [
    ['/', 'dashboard', navGroups[0][1][0][3]],
    ['/properties', 'properties', navGroups[1][1][0][3]],
    ['/contracts', 'contracts', navGroups[1][1][4][3]],
    ['/financials', 'financials', navGroups[2][1][0][3]],
    ['/arrears', 'arrears', navGroups[2][1][2][3]],
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
      <div className="grid h-16 grid-cols-5">
        {mobileItems.map(([to, labelKey, Icon]) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            aria-label={sharedLabel(labelKey)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors [&.active]:text-primary"
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-bold leading-none">{sharedLabel(labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
