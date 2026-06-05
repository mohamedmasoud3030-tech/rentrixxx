import type { LandsState } from '../types';

export async function fetchLandsReadModel(): Promise<LandsState> {
  return { status: 'unavailable', reason: 'لا يحتوي مخطط قاعدة البيانات الموثق حاليًا على جدول أراضٍ يمكن قراءته بأمان.' };
}
