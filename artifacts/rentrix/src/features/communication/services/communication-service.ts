import type { CommunicationState } from '../types';

export async function fetchCommunicationReadModel(): Promise<CommunicationState> {
  return { status: 'unavailable', reason: 'لا يوجد جدول رسائل أو مزود تواصل موثق في المخطط الحالي؛ لن يتم إرسال رسائل أو استدعاء مزود خارجي.' };
}
