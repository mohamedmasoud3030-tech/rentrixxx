import { Link } from '@tanstack/react-router';
import { Plus, Sparkles } from 'lucide-react';
import { canShowNavigationItem, type AuthorizationContext } from '@/features/auth/permissions';
import { cn } from '@/lib/utils';
import { mobileNavItems, navGroups, quickLinks, type QuickLinkRoute } from './app-nav-items';

export type SharedLabel = (key: string) => string;

export function NavigationLinks({
  authorization,
  expanded,
  sharedLabel,
  onNavigate,
  wrapText = false,
}: Readonly<{ authorization: AuthorizationContext | null; expanded: boolean; sharedLabel: SharedLabel; onNavigate?: () => void; wrapText?: boolean }>) {
  return (
    <div className="space-y-5">
      {navGroups.map(([sectionTitle, items]) => (
        <section key={sectionTitle} className="space-y-1">
          {expanded ? (
            <p className="px-3 pb-1 text-[10px] font-black tracking-[0.14em] uppercase text-sidebar-foreground/60">
              {sectionTitle}
            </p>
          ) : null}
          {items.map(([to, labelKey, description, Icon, permission]) => {
            if (!canShowNavigationItem(authorization, permission)) return null;

            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                aria-label={sharedLabel(labelKey)}
                title={expanded ? undefined : `${sharedLabel(labelKey)} — ${description}`}
                activeOptions={{ exact: to === '/' }}
                className="group relative flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sidebar-foreground transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-sidebar-accent hover:text-white [&.active]:border-white/15 [&.active]:bg-primary [&.active]:text-primary-foreground"
              >
                <Icon className="size-5 shrink-0 transition-transform group-hover:scale-110" />
                {expanded ? (
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] font-black', wrapText ? 'whitespace-normal leading-snug' : 'truncate')}>{sharedLabel(labelKey)}</span>
                    <span className={cn('block text-[10px] font-bold text-sidebar-foreground/50 group-hover:text-white/70', wrapText ? 'whitespace-normal leading-snug' : 'truncate')}>
                      {description}
                    </span>
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute end-[calc(100%+0.75rem)] top-1/2 z-50 hidden min-w-52 -translate-y-1/2 rounded-2xl border border-white/10 bg-sidebar px-3 py-2 text-right text-sidebar-foreground opacity-0 shadow-2xl transition-all group-hover:block group-hover:opacity-100 group-focus-visible:block group-focus-visible:opacity-100"
                  >
                    <span className="block text-[12px] font-black text-white">{sharedLabel(labelKey)}</span>
                    <span className="mt-0.5 block text-[10px] font-bold leading-5 text-sidebar-foreground/65">{description}</span>
                  </span>
                )}
              </Link>
            );
          })}
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
          <Plus className="ms-auto size-3.5 shrink-0 opacity-50" />
        </button>
      ))}
    </section>
  );
}

export function MobileBottomNav({ authorization, sharedLabel }: Readonly<{ authorization: AuthorizationContext | null; sharedLabel: SharedLabel }>) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid min-h-16 grid-cols-5">
        {mobileNavItems.map(([to, labelKey, Icon]) => {
          if (!canShowNavigationItem(authorization, undefined)) return null;

          return (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/' }}
              aria-label={sharedLabel(labelKey)}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-muted-foreground transition-colors [&.active]:text-primary"
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate text-[10px] font-bold leading-none">{sharedLabel(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
