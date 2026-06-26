import type { ReactNode } from 'react';
import { ResponsiveFormOverlay } from '@/components/ui/responsive-form-overlay';

export type ModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}>;

/**
 * Responsive modal surface: dialog on desktop, bottom sheet on mobile.
 * Keep form overlays on this component instead of branching by viewport in pages.
 */
export function Modal(props: ModalProps) {
  return <ResponsiveFormOverlay {...props} />;
}
