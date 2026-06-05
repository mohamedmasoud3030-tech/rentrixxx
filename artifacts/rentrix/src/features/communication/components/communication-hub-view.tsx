import { MessageSquareText } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CommunicationState } from '../types';

export function CommunicationHubView({ state }: Readonly<{ state: CommunicationState }>) {
  return <Card role="alert"><CardHeader><MessageSquareText className="size-8 text-primary" /><CardTitle>مركز التواصل قراءة فقط وغير متاح بأمان</CardTitle><CardDescription>{state.reason}</CardDescription></CardHeader></Card>;
}
