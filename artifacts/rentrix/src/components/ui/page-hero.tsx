import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type HeroPillTone = 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';

type HeroPill = Readonly<{
  label: string;
  icon?: LucideIcon;
  tone?: HeroPillTone;
}>;

type PageHeroProps = Readonly<{
  eyebrow: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  primaryMetric: string | number;
  primaryLabel: string;
  secondaryMetric?: string | number;
  secondaryLabel?: string;
  pills?: readonly HeroPill[];
  action?: ReactNode;
  isLoading?: boolean;
  accent?: 'primary' | 'emerald' | 'sky' | 'amber' | 'rose';
}>;

const accentGlow = {
  primary: 'bg-primary/20',
  emerald: 'bg-emerald-500/20',
  sky: 'bg-sky-500/20',
  amber: 'bg-amber-500/20',
  rose: 'bg-rose-500/20',
} as const;

const pillToneClass: Record<HeroPillTone, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-300',
  rose: 'bg-rose-500/20 text-rose-300',
  sky: 'bg-sky-500/20 text-sky-300',
  slate: 'bg-white/10 text-slate-300',
};

export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  primaryMetric,
  primaryLabel,
  secondaryMetric,
  secondaryLabel,
  pills = [],
  action,
  isLoading = false,
  accent = 'primary',
}: PageHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white sm:rounded-3xl sm:p-6">
      <div className={cn('pointer-events-none absolute -left-8 -top-8 size-40 rounded-full blur-3xl', accentGlow[accent])} />
      <div className="pointer-events-none absolute -bottom-8 -right-4 size-32 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-400">
              <Icon className="size-4" />
              {eyebrow}
            </p>
            <h1 className="mt-0.5 text-xl font-black sm:text-2xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{description}</p> : null}
          </div>
          {action ? <div className="w-full shrink-0 [&_.pressable]:w-full sm:w-auto sm:[&_.pressable]:w-auto">{action}</div> : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end">
          <div className="min-w-0">
            {isLoading ? <Skeleton className="h-10 w-20 bg-white/10" /> : <p className="break-words text-3xl font-black tabular-nums sm:text-4xl">{primaryMetric}</p>}
            <p className="text-sm font-semibold text-slate-400">{primaryLabel}</p>
          </div>
          {secondaryMetric !== undefined && secondaryLabel ? (
            <>
              <div className="hidden h-10 w-px bg-white/20 min-[420px]:mb-1 min-[420px]:ms-4 min-[420px]:block" />
              <div className="min-w-0">
                {isLoading ? <Skeleton className="h-6 w-24 bg-white/10" /> : <p className="break-words text-lg font-black" dir="ltr">{secondaryMetric}</p>}
                <p className="text-xs font-semibold text-slate-400">{secondaryLabel}</p>
              </div>
            </>
          ) : null}
        </div>

        {pills.length > 0 ? (
          <div className="-mx-1 mt-4 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {pills.map((pill) => {
              const PillIcon = pill.icon;
              return (
                <div key={pill.label} className={cn('flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold', pillToneClass[pill.tone ?? 'slate'])}>
                  {PillIcon ? <PillIcon className="size-3" /> : null}
                  {pill.label}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
