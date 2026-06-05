import { MapPinned } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LandsState } from '../types';

export function LandsView({ state }: Readonly<{ state: LandsState }>) {
  return <Card role="alert"><CardHeader><MapPinned className="size-8 text-primary" /><CardTitle>الأراضي غير متاحة بأمان</CardTitle><CardDescription>{state.reason}</CardDescription></CardHeader></Card>;
}
