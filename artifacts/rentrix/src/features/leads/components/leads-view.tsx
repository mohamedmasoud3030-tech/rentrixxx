import { ContactRound } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LeadsState } from '../types';

export function LeadsView({ state }: Readonly<{ state: LeadsState }>) {
  return <Card role="alert"><CardHeader><ContactRound className="size-8 text-primary" /><CardTitle>العملاء المحتملون غير متاحين بأمان</CardTitle><CardDescription>{state.reason}</CardDescription></CardHeader></Card>;
}
