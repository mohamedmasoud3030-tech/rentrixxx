import { useEffect, useState, type ReactNode } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const mobileFormQuery = '(max-width: 767px)';

export type ResponsiveFormSurface = 'bottom-sheet' | 'dialog';

export function getResponsiveFormSurface(matchesMobile: boolean): ResponsiveFormSurface {
  return matchesMobile ? 'bottom-sheet' : 'dialog';
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener('change', updateMatches);
    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

type ResponsiveFormOverlayProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}>;

export function ResponsiveFormOverlay({ open, onOpenChange, title, description, children, className }: ResponsiveFormOverlayProps) {
  const matchesMobile = useMediaQuery(mobileFormQuery);
  const surface = getResponsiveFormSurface(matchesMobile);

  if (surface === 'bottom-sheet') {
    return (
      <BottomSheet open={open} onClose={() => onOpenChange(false)} title={title} className={className}>
        {description ? <p className="mb-4 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        {children}
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
