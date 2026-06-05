import type { CommissionsState } from '../types';

export async function fetchCommissionsReadModel(): Promise<CommissionsState> {
  return { status: 'unavailable', reason: 'لا يحتوي المخطط الموثق على جدول عمولات منفصل؛ لذلك تبقى العمولات قراءة فقط وغير متاحة دون تسوية أو مدفوعات.' };
}
