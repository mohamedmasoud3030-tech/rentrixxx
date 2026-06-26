import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ColorTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';
/** Semantic tones — prefer these in new code. Color tones remain supported
 * for existing call sites so this stays a non-breaking change. */
type SemanticTone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type StatusTone = ColorTone | SemanticTone;

/** Maps semantic tones onto the existing color tones so there is exactly
 * one visual treatment per meaning, regardless of which tone name a
 * feature uses. New code should use semantic tones; domain status→tone
 * mapping (e.g. contract status) stays inside the feature, never here. */
const semanticToColor: Record<SemanticTone, ColorTone> = {
  primary: 'blue',
  info: 'blue',
  secondary: 'gray',
  neutral: 'gray',
  success: 'green',
  warning: 'gold',
  danger: 'red',
};

const tones: Record<ColorTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-400/25',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/25',
  red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/15 dark:text-rose-200 dark:ring-rose-400/25',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20',
  gold: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/25',
};

const dotTones: Record<ColorTone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  gray: 'bg-slate-400',
  gold: 'bg-amber-500',
};

const resolveColorTone = (tone: StatusTone): ColorTone => (tone in semanticToColor ? semanticToColor[tone as SemanticTone] : (tone as ColorTone));

/** Shared status pill used by both entity cards and table cells, so the
 * same status always renders identically regardless of where it appears.
 * Accepts semantic tones (success/warning/danger/info/neutral/primary/secondary)
 * — prefer these in new code — or the legacy color tones for existing call sites. */
export function StatusBadge({ tone, children, className, dot = false }: { tone: StatusTone; children: ReactNode; className?: string; dot?: boolean }) {
  const colorTone = resolveColorTone(tone);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset', tones[colorTone], className)}>
      {dot ? <span className={cn('size-1.5 rounded-full', dotTones[colorTone])} /> : null}
      {children}
    </span>
  );
}
