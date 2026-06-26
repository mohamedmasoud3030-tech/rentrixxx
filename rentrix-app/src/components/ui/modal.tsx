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

/** Dialog on desktop and bottom sheet on mobile. */
export function Modal(props: ModalProps) {
  return <ResponsiveFormOverlay {...props} />;
}
