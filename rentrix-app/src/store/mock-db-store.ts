import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AuditEvent,
  Expense,
  Invoice,
  LeaseContract,
  Owner,
  OwnerAgreement,
  OwnerSettlement,
  PaymentReceipt,
  Property,
  Tenant,
  Unit,
} from '@/domain/types';

export interface MockDatabaseState {
  readonly owners: readonly Owner[];
  readonly properties: readonly Property[];
  readonly agreements: readonly OwnerAgreement[];
  readonly units: readonly Unit[];
  readonly tenants: readonly Tenant[];
  readonly contracts: readonly LeaseContract[];
  readonly invoices: readonly Invoice[];
  readonly receipts: readonly PaymentReceipt[];
  readonly expenses: readonly Expense[];
  readonly settlements: readonly OwnerSettlement[];
  readonly auditEvents: readonly AuditEvent[];
}

interface MockDatabaseActions {
  replaceDatabase: (nextState: MockDatabaseState) => void;
  resetDatabase: () => void;
}

export type MockDatabaseStore = MockDatabaseState & MockDatabaseActions;

const createdAt = '2026-06-28T08:00:00.000Z';

export const mockDatabaseSeed: MockDatabaseState = {
  owners: [
    { id: 'owner-al-sharif', name: 'شركة الشريف العقارية', phone: '+966500000101', email: 'ops@alsharif.example', isArchived: false, createdAt },
    { id: 'owner-al-nour', name: 'مؤسسة النور للاستثمار', phone: '+966500000202', email: 'info@alnour.example', isArchived: false, createdAt },
  ],
  properties: [
    { id: 'property-al-yasmin', ownerId: 'owner-al-sharif', name: 'برج الياسمين', address: 'الرياض، حي الياسمين، شارع أنس بن مالك', isArchived: false, createdAt },
    { id: 'property-al-nakheel', ownerId: 'owner-al-sharif', name: 'عمارة النخيل', address: 'جدة، حي النخيل، طريق الملك عبدالعزيز', isArchived: false, createdAt },
    { id: 'property-al-waha', ownerId: 'owner-al-nour', name: 'مجمع الواحة', address: 'الدمام، حي الواحة، شارع الخليج', isArchived: false, createdAt },
  ],
  agreements: [
    { id: 'agreement-yasmin-management', ownerId: 'owner-al-sharif', propertyId: 'property-al-yasmin', agreementType: 'property_management', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', commissionRate: 8, fixedFee: 1500, isArchived: false, createdAt },
    { id: 'agreement-waha-master-lease', ownerId: 'owner-al-nour', propertyId: 'property-al-waha', agreementType: 'master_lease', startDate: '2026-02-01', endDate: '2027-01-31', status: 'active', fixedFee: 42000, isArchived: false, createdAt },
  ],
  units: [
    { id: 'unit-yasmin-101', propertyId: 'property-al-yasmin', name: 'شقة 101', rentAmount: 36000, status: 'occupied', isArchived: false, createdAt },
    { id: 'unit-yasmin-102', propertyId: 'property-al-yasmin', name: 'شقة 102', rentAmount: 34000, status: 'vacant', isArchived: false, createdAt },
    { id: 'unit-nakheel-201', propertyId: 'property-al-nakheel', name: 'مكتب 201', rentAmount: 52000, status: 'maintenance', isArchived: false, createdAt },
    { id: 'unit-waha-a1', propertyId: 'property-al-waha', name: 'فيلا A1', rentAmount: 78000, status: 'vacant', isArchived: false, createdAt },
    { id: 'unit-waha-a2', propertyId: 'property-al-waha', name: 'فيلا A2', rentAmount: 76000, status: 'vacant', isArchived: false, createdAt },
  ],
  tenants: [
    { id: 'tenant-faisal', name: 'فيصل العتيبي', phone: '+966511111111', email: 'faisal@example.com', isArchived: false, createdAt },
    { id: 'tenant-noura', name: 'نورة الحربي', phone: '+966522222222', email: 'noura@example.com', isArchived: false, createdAt },
  ],
  contracts: [
    { id: 'contract-yasmin-101-faisal', tenantId: 'tenant-faisal', unitId: 'unit-yasmin-101', propertyId: 'property-al-yasmin', agreementId: 'agreement-yasmin-management', startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', rentAmount: 36000, paymentFrequency: 'monthly', createdAt },
  ],
  invoices: [
    { id: 'invoice-yasmin-jan', contractId: 'contract-yasmin-101-faisal', amount: 3000, dueDate: '2026-01-05', status: 'paid', createdAt },
    { id: 'invoice-yasmin-feb', contractId: 'contract-yasmin-101-faisal', amount: 3000, dueDate: '2026-02-05', status: 'paid', createdAt },
    { id: 'invoice-yasmin-mar', contractId: 'contract-yasmin-101-faisal', amount: 3000, dueDate: '2026-03-05', status: 'unpaid', createdAt },
  ],
  receipts: [],
  expenses: [],
  settlements: [],
  auditEvents: [],
};

const memoryStorage = new Map<string, string>();

const fallbackStorage: Storage = {
  get length() {
    return memoryStorage.size;
  },
  clear: () => memoryStorage.clear(),
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
  },
};

function resolveMockStorage(): Storage {
  if (typeof window === 'undefined') return fallbackStorage;
  return window.localStorage ?? fallbackStorage;
}

export const useMockDatabaseStore = create<MockDatabaseStore>()(
  persist(
    (set) => ({
      ...mockDatabaseSeed,
      replaceDatabase: (nextState) => set(nextState),
      resetDatabase: () => set(mockDatabaseSeed),
    }),
    {
      name: 'rentrix.phase2.mock-db.v1',
      storage: createJSONStorage(resolveMockStorage),
      partialize: ({ replaceDatabase: _replaceDatabase, resetDatabase: _resetDatabase, ...state }) => state,
    },
  ),
);

export function getMockDatabaseSnapshot(): MockDatabaseState {
  const { replaceDatabase: _replaceDatabase, resetDatabase: _resetDatabase, ...state } = useMockDatabaseStore.getState();
  return state;
}
