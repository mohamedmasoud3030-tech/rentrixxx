import { BadgeDollarSign } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CommissionsState } from '../types';

export function CommissionsView({ state }: Readonly<{ state: CommissionsState }>) {
  return <Card role="alert"><CardHeader><BadgeDollarSign className="size-8 text-primary" /><CardTitle>العمولات قراءة فقط وغير متاحة بأمان</CardTitle><CardDescription>{state.reason}</CardDescription></CardHeader></Card>;
}
