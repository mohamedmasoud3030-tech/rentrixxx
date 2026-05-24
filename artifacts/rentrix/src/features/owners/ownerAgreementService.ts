import type { OwnerAgreementTerm, OwnerManagementAgreement } from './ownerAgreementTypes';
import { validateOwnerAgreementDraft, validateOwnerAgreementTerms, type OwnerAgreementDraftInput } from './ownerAgreementValidation';

type OwnerAgreementWriteInput = OwnerAgreementDraftInput & Partial<OwnerManagementAgreement> & { terms?: Partial<OwnerAgreementTerm> };

function notReady(): never { throw new Error('خدمة اتفاقيات الإدارة ستُفعّل بعد تحديث عميل قاعدة البيانات.'); }

export async function listOwnerAgreements(_params?: { ownerId?: string; propertyId?: string; status?: string }): Promise<OwnerManagementAgreement[]> { return notReady(); }
export async function getOwnerAgreement(_id: string): Promise<OwnerManagementAgreement> { return notReady(); }
export async function createOwnerAgreement(input: OwnerAgreementWriteInput): Promise<OwnerManagementAgreement> { const draft = validateOwnerAgreementDraft(input); if (!draft.success) throw new Error(draft.errors[0]); if (input.terms) { const terms = validateOwnerAgreementTerms(input.terms, input.agreement_type); if (!terms.success) throw new Error(terms.errors[0]); } return notReady(); }
export async function updateOwnerAgreement(_id: string, _input: Partial<OwnerAgreementWriteInput>): Promise<OwnerManagementAgreement> { return notReady(); }
export async function terminateOwnerAgreement(_id: string, _endsOn: string): Promise<OwnerManagementAgreement> { return notReady(); }
export async function listAgreementsForOwner(_ownerId: string): Promise<OwnerManagementAgreement[]> { return notReady(); }
export async function listAgreementsForProperty(_propertyId: string): Promise<OwnerManagementAgreement[]> { return notReady(); }
