import type { ReactNode, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface EntityActionsProps {
  children: ReactNode;
  className?: string;
}

export function stopEntityActionPropagation(event: MouseEvent<any> | any) {
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }
}

export function EntityActions({ children, className }: EntityActionsProps) {
  return (
    <div 
      className={cn('flex items-center gap-2', className)} 
      onClick={stopEntityActionPropagation}
    >
      {children}
    </div>
  );
}
