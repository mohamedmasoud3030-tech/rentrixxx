import { Briefcase, Contact, IdCard, Mail, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonCardProps {
  id: string;
  fullName: string;
  type: 'tenant' | 'owner' | 'contact' | string;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  address?: string | null;
  onClick?: () => void;
}

const typeMap: Record<string, { label: string; bg: string; text: string; icon: typeof User }> = {
  tenant:  { label: 'مستأجر',    bg: 'bg-primary/10',                              text: 'text-primary',                              icon: User },
  owner:   { label: 'مالك',      bg: 'bg-emerald-100 dark:bg-emerald-950/50',      text: 'text-emerald-700 dark:text-emerald-300',     icon: Briefcase },
  contact: { label: 'جهة اتصال', bg: 'bg-slate-100 dark:bg-slate-800',             text: 'text-slate-600 dark:text-slate-300',         icon: Contact },
};

export function PersonCard({
  fullName,
  type,
  phone,
  email,
  nationalId,
  address,
  onClick,
}: PersonCardProps) {
  const t = typeMap[type] ?? typeMap['contact']!;
  const Icon = t.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border border-border/60 bg-card p-4 text-start',
        'hover:shadow-md hover:border-primary/30 active:scale-[0.98]',
        'transition-all duration-150',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', t.bg)}>
            <Icon className={cn('size-4', t.text)} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug truncate">{fullName}</p>
            {address && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{address}</p>}
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', t.bg, t.text)}>
          {t.label}
        </span>
      </div>

      {/* Contact details */}
      {(phone || email || nationalId) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border/40 pt-3 text-xs text-muted-foreground">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              <span dir="ltr">{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span dir="ltr" className="truncate">{email}</span>
            </div>
          )}
          {nationalId && (
            <div className="flex items-center gap-1.5">
              <IdCard className="size-3.5 shrink-0" />
              <span dir="ltr">{nationalId}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
