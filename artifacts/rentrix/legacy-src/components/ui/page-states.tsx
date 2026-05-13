import React from 'react';
import { DSButton, DSCard, DSText } from '@/design-system';

type Tone = 'default' | 'error';

export const LoadingState: React.FC<{ title?: string; message?: string }> = ({
  title = 'جاري التحميل...',
  message = 'يرجى الانتظار حتى يتم تجهيز البيانات.',
}) => (
  <DSCard className="space-y-3 py-10 text-center">
    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    <DSText as="h3" variant="h3" className="text-text">{title}</DSText>
    <DSText className="text-text-muted">{message}</DSText>
  </DSCard>
);

export const EmptyState: React.FC<{ title?: string; message: string; action?: React.ReactNode }> = ({
  title = 'لا توجد بيانات',
  message,
  action,
}) => (
  <DSCard className="space-y-3 py-10 text-center">
    <DSText as="h3" variant="h3" className="text-text">{title}</DSText>
    <DSText className="text-text-muted">{message}</DSText>
    {action}
  </DSCard>
);

export const ErrorState: React.FC<{ title?: string; message: string; action?: React.ReactNode; onRetry?: () => void }> = ({
  title = 'حدث خطأ',
  message,
  action,
  onRetry,
}) => (
  <DSCard className="space-y-3 py-10 text-center">
    <DSText as="h3" variant="h3" className="text-red-600">{title}</DSText>
    <DSText className="text-text-muted">{message}</DSText>
    {action}
    {!action && onRetry && (
      <DSButton onClick={onRetry} variant="secondary" className="border-red-300 text-red-700 hover:bg-red-50">
        إعادة المحاولة
      </DSButton>
    )}
  </DSCard>
);

export const PageStateCard: React.FC<{ title: string; message: string; tone?: Tone; action?: React.ReactNode }> = ({
  title,
  message,
  tone = 'default',
  action,
}) => (
  <DSCard className="space-y-3 rounded-2xl p-8 text-center">
    <DSText as="h2" variant="h2" className={tone === 'error' ? 'text-red-600' : 'text-text'}>{title}</DSText>
    <DSText className="text-text-muted">{message}</DSText>
    {action}
  </DSCard>
);
