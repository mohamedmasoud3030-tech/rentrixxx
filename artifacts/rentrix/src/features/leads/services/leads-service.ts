import type { LeadsState } from '../types';

export async function fetchLeadsReadModel(): Promise<LeadsState> {
  return { status: 'unavailable', reason: 'لا يحتوي مخطط قاعدة البيانات الموثق حاليًا على جدول عملاء محتملين أو مراحل CRM يمكن قراءتها بأمان.' };
}
