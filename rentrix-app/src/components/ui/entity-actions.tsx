import type { ReactNode, MouseEvent, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface EntityActionsProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function stopEntityActionPropagation(event: MouseEvent<any> | KeyboardEvent<any> | any) {
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }
}

export function EntityActions({ children, className }: Readonly<EntityActionsProps>) {
  return (
    <div 
      className={cn('flex items-center gap-2', className)} 
      onClick={stopEntityActionPropagation}
      onKeyDown={stopEntityActionPropagation}
      role="presentation"
    >
      {children}
    </div>
  );
}
