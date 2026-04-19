import type { AppContextType, Contract } from '../../src/types';
import { mapContractPayload } from '../../src/mappers/contractMapper';

type ContractRawInput = {
  id?: string;
  unitId?: string;
  tenantId?: string;
  rent?: number;
  dueDay?: number;
  start?: string;
  end?: string;
  deposit?: number;
  status?: Contract['status'];
  sponsorName?: string;
  sponsorId?: string;
  sponsorPhone?: string;
};

const FORBIDDEN_CAMEL_DB_KEYS = ['unitId', 'tenantId', 'rent', 'start', 'end'] as const;
const ALLOWED_RAW_KEYS = [
  'id',
  'unitId',
  'tenantId',
  'rent',
  'dueDay',
  'start',
  'end',
  'deposit',
  'status',
  'sponsorName',
  'sponsorId',
  'sponsorPhone',
] as const;

const REQUIRED_FIELDS: Array<keyof ReturnType<typeof mapContractPayload>> = [
  'unit_id',
  'tenant_id',
  'rent_amount',
  'start_date',
  'end_date',
];

export class ContractEngine {
  private static dataService: AppContextType['dataService'] | null = null;

  static configure(dataService: AppContextType['dataService']) {
    ContractEngine.dataService = dataService;
  }

  private static assertStrictPayload(input: ContractRawInput) {
    const unknown = Object.keys(input).filter((key) => !(ALLOWED_RAW_KEYS as readonly string[]).includes(key));
    if (unknown.length > 0) {
      throw new Error(`Unknown contract fields: ${unknown.join(', ')}`);
    }
  }

  private static assertNoCamelDbKeys(payload: Record<string, unknown>) {
    const hasForbidden = FORBIDDEN_CAMEL_DB_KEYS.some((key) => key in payload);
    if (hasForbidden) {
      throw new Error('INVALID PAYLOAD DETECTED: use ContractEngine + mapper');
    }
  }

  static async create(input: ContractRawInput): Promise<Contract> {
    if (!ContractEngine.dataService) {
      throw new Error('ContractEngine is not configured with dataService.');
    }
    ContractEngine.assertStrictPayload(input);

    const payload = mapContractPayload(input);
    ContractEngine.assertNoCamelDbKeys(payload);
    for (const field of REQUIRED_FIELDS) {
      const value = payload[field];
      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing required contract field: ${field}`);
      }
    }

    if (input.id) {
      await ContractEngine.dataService.update('contracts', input.id, payload);
      return {
        id: input.id,
        unitId: String(payload.unit_id),
        tenantId: String(payload.tenant_id),
        rent: Number(payload.rent_amount),
        dueDay: Number(payload.due_day),
        start: String(payload.start_date),
        end: String(payload.end_date),
        deposit: Number(payload.deposit ?? 0),
        status: payload.status || 'ACTIVE',
        sponsorName: payload.sponsor_name || '',
        sponsorId: payload.sponsor_id || '',
        sponsorPhone: payload.sponsor_phone || '',
        createdAt: Date.now(),
      };
    }

    const inserted = await ContractEngine.dataService.add('contracts', payload as unknown as Omit<Contract, 'id' | 'createdAt' | 'no'>);

    if (!inserted) {
      throw new Error('Failed to create contract in database.');
    }

    return inserted as Contract;
  }
}
