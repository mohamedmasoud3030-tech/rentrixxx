import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/lib/supabase-error';
import type { OwnerAgreementStatus, OwnerAgreementTerm, OwnerManagementAgreement } from './ownerAgreementTypes';
import { validateOwnerAgreementDraft, validateOwnerAgreementTerms, type OwnerAgreementDraftInput } from './ownerAgreementValidation';

type OwnerAgreementWriteInput = OwnerAgreementDraftInput & Partial<OwnerManagementAgreement> & { terms?: Partial<OwnerAgreementTerm> };
type OwnerAgreementSupabasePayload = Record<string, string | number | boolean | null | undefined>;

export type OwnerAgreementListItem = OwnerManagementAgreement & {
  owner: { id: string; full_name: string | null } | null;
  property: { id: string; title: string | null } | null;
};

const AGREEMENT_SELECT = `
id, property_id, owner_id, property_owner_id, agreement_type, status, starts_on, ends_on, currency, calculation_basis,
payout_cycle, payout_day, min_payout_amount, carry_forward_deficit, tax_inclusive, deposit_treatment, rounding_mode, notes, created_at, updated_at,
owner:owners!owner_management_agreements_owner_id_fkey(id, full_name),
property:properties!owner_management_agreements_property_id_fkey(id, title)
`;

function fromOwnerManagementAgreements() {
  return supabase.from('owner_management_agreements' as never); // NOSONAR: migration-backed table is ahead of generated Database type coverage.
}

function toSupabasePayload(input: OwnerAgreementSupabasePayload) {
  return input as never; // NOSONAR: required until generated Database types include owner_management_agreements.
}

function normalizeWriteInput(input: Partial<OwnerAgreementWriteInput>): OwnerAgreementSupabasePayload {
  return {
    owner_id: input.owner_id,
    property_id: input.property_id,
    agreement_type: input.agreement_type,
    status: input.status,
    starts_on: input.starts_on,
    ends_on: input.ends_on ?? null,
    currency: input.currency ?? 'OMR',
    calculation_basis: input.calculation_basis ?? 'cash_collected',
    payout_cycle: input.payout_cycle ?? 'monthly',
    payout_day: input.payout_day ?? null,
    notes: input.notes ?? null,
  };
}

export async function listOwnerAgreements(params?: { ownerId?: string; propertyId?: string; status?: OwnerAgreementStatus }): Promise<OwnerAgreementListItem[]> {
  let query = fromOwnerManagementAgreements().select(AGREEMENT_SELECT).order('starts_on', { ascending: false });
  if (params?.ownerId) query = query.eq('owner_id', params.ownerId);
  if (params?.propertyId) query = query.eq('property_id', params.propertyId);
  if (params?.status) query = query.eq('status', params.status);
  const { data, error } = await query;
  if (error) handleSupabaseError(error, 'تعذر تحميل اتفاقيات الإدارة');
  return (data ?? []) as unknown as OwnerAgreementListItem[];
}

export async function getOwnerAgreement(id: string): Promise<OwnerAgreementListItem> {
  const { data, error } = await fromOwnerManagementAgreements().select(AGREEMENT_SELECT).eq('id', id).single();
  if (error) handleSupabaseError(error, 'تعذر تحميل اتفاقية الإدارة');
  return data as unknown as OwnerAgreementListItem;
}

export async function createOwnerAgreement(input: OwnerAgreementWriteInput): Promise<OwnerAgreementListItem> {
  const draft = validateOwnerAgreementDraft(input);
  if (!draft.success) throw new Error(draft.errors[0]);
  if (input.terms) {
    const terms = validateOwnerAgreementTerms(input.terms, input.agreement_type);
    if (!terms.success) throw new Error(terms.errors[0]);
  }
  const { data, error } = await fromOwnerManagementAgreements().insert(toSupabasePayload(normalizeWriteInput(input))).select(AGREEMENT_SELECT).single();
  if (error) handleSupabaseError(error, 'تعذر إنشاء اتفاقية الإدارة');
  return data as unknown as OwnerAgreementListItem;
}

export async function updateOwnerAgreement(id: string, input: Partial<OwnerAgreementWriteInput>): Promise<OwnerAgreementListItem> {
  if (input.terms && input.agreement_type) {
    const terms = validateOwnerAgreementTerms(input.terms, input.agreement_type);
    if (!terms.success) throw new Error(terms.errors[0]);
  }
  const { data, error } = await fromOwnerManagementAgreements().update(toSupabasePayload(normalizeWriteInput(input))).eq('id', id).select(AGREEMENT_SELECT).single();
  if (error) handleSupabaseError(error, 'تعذر تحديث اتفاقية الإدارة');
  return data as unknown as OwnerAgreementListItem;
}

export async function terminateOwnerAgreement(id: string, endsOn: string): Promise<OwnerAgreementListItem> {
  const payload = toSupabasePayload({ status: 'terminated', ends_on: endsOn });
  const { data, error } = await fromOwnerManagementAgreements().update(payload).eq('id', id).select(AGREEMENT_SELECT).single();
  if (error) handleSupabaseError(error, 'تعذر إنهاء اتفاقية الإدارة');
  return data as unknown as OwnerAgreementListItem;
}

export async function listAgreementsForOwner(ownerId: string): Promise<OwnerAgreementListItem[]> { return listOwnerAgreements({ ownerId }); }
export async function listAgreementsForProperty(propertyId: string): Promise<OwnerAgreementListItem[]> { return listOwnerAgreements({ propertyId }); }
