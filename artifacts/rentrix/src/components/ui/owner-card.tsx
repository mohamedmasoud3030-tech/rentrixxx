import { Building2, Mail, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OwnerCardProps {
  id: string;
  displayName: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  propertyCount: number;
  activeContractCount: number;
  onClick?: () => void;
}

export function formatOwnerShortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

export function OwnerCard({
  id,
  displayName,
  fullName,
  phone,
  email,
  propertyCount,
  activeContractCount,
  onClick,
}: OwnerCardProps) {
  const visibleShortId = id ? formatOwnerShortId(id) : null;
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
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10">
            <Users className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug">{displayName}</p>
            {fullName && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{fullName}</p>}
            {visibleShortId ? (
              <p className="text-[10px] font-bold text-muted-foreground/70 mt-0.5" dir="ltr">
                معرّف السجل: {visibleShortId}
              </p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-primary/10 text-primary">
          مالك
        </span>
      </div>

      {/* Contact */}
      {(phone || email) && (
        <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 shrink-0" />
              <span dir="ltr">{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 shrink-0" />
              <span dir="ltr" className="truncate">{email}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5" />
          <span>{propertyCount} عقار</span>
        </div>
        {activeContractCount > 0 && (
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <span>{activeContractCount} عقد نشط</span>
          </div>
        )}
      </div>
    </button>
  );
}
