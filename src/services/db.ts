import Dexie, { Table, IndexableType } from 'dexie';
import { 
    User, Settings, Owner, Property, Unit, Tenant, Contract, Invoice, Receipt, 
    ReceiptAllocation, Expense, MaintenanceRecord, DepositTx,
    AuditLogEntry, Governance, OwnerSettlement, Serials, Snapshot, 
    Account, JournalEntry, Database,
    OwnerBalance, AccountBalance, KpiSnapshot, ContractBalance, TenantBalance, AutoBackup,
    NotificationTemplate, OutgoingNotification, AppNotification, Lead, Land, Commission, Mission, Budget,
    Attachment
} from '../types';
import { toast } from 'react-hot-toast';

export type SettingsWithId = Settings & { id: number };
export type GovernanceWithId = Governance & { id: number };
export type SerialsWithId = Serials & { id: number };

export class RentrixDB extends Dexie {
    settings!: Table<SettingsWithId, number>;
    users!: Table<User, string>;
    owners!: Table<Owner, string>;
    properties!: Table<Property, string>;
    units!: Table<Unit, string>;
    tenants!: Table<Tenant, string>;
    contracts!: Table<Contract, string>;
    invoices!: Table<Invoice, string>;
    receipts!: Table<Receipt, string>;
    receiptAllocations!: Table<ReceiptAllocation, string>;
    expenses!: Table<Expense, string>;
    maintenanceRecords!: Table<MaintenanceRecord, string>;
    depositTxs!: Table<DepositTx, string>;
    auditLog!: Table<AuditLogEntry, string>;
    governance!: Table<GovernanceWithId, number>;
    ownerSettlements!: Table<OwnerSettlement, string>;
    serials!: Table<SerialsWithId, number>;
    snapshots!: Table<Snapshot, string>;
    accounts!: Table<Account, string>;
    journalEntries!: Table<JournalEntry, string>;
    autoBackups!: Table<AutoBackup, string>;
    // Phase 1 Snapshots
    ownerBalances!: Table<OwnerBalance, string>;
    accountBalances!: Table<AccountBalance, string>;
    kpiSnapshots!: Table<KpiSnapshot, string>;
    contractBalances!: Table<ContractBalance, string>;
    tenantBalances!: Table<TenantBalance, string>;

    notificationTemplates!: Table<NotificationTemplate, string>;
    outgoingNotifications!: Table<OutgoingNotification, string>;
    appNotifications!: Table<AppNotification, string>;
    leads!: Table<Lead, string>;
    lands!: Table<Land, string>;
    commissions!: Table<Commission, string>;
    missions!: Table<Mission, string>;
    budgets!: Table<Budget, string>;
    attachments!: Table<Attachment, string>;

    constructor() {
        super('Rentrix_Light_DB');
        // FIX: Incremented Dexie DB version to accommodate schema change for attachments table.
        (this as Dexie).version(3).stores({
            settings: 'id',
            users: 'id, username',
            owners: 'id, name, phone',
            properties: 'id, ownerId, name',
            units: 'id, propertyId, name, type, status',
            tenants: 'id, name, phone, idNo',
            contracts: 'id, no, unitId, tenantId, status, end, [unitId+status]',
            invoices: 'id, contractId, status, dueDate, type, [contractId+status+dueDate]',
            receipts: 'id, no, contractId, dateTime, status, [contractId+dateTime]',
            receiptAllocations: 'id, receiptId, invoiceId',
            expenses: 'id, no, contractId, dateTime, category, status',
            maintenanceRecords: 'id, no, unitId, status, requestDate',
            depositTxs: 'id, contractId',
            auditLog: 'id, ts, userId, action',
            governance: 'id',
            ownerSettlements: 'id, no, ownerId, date',
            serials: 'id',
            snapshots: 'id, ts',
            accounts: 'id, no, parentId',
            journalEntries: 'id, date, accountId, sourceId, [entityType+entityId]',
            autoBackups: '&id',
            // Phase 1 Snapshot Tables
            ownerBalances: '&ownerId',
            accountBalances: '&accountId',
            kpiSnapshots: '&id',
            contractBalances: '&contractId, tenantId, unitId',
            tenantBalances: '&tenantId',
            // New Tables
            notificationTemplates: 'id',
            outgoingNotifications: 'id, status',
            appNotifications: 'id, isRead, role',
            leads: 'id, no, name, phone',
            lands: 'id, plotNo',
            commissions: 'id, staffId, status',
            missions: 'id, no, date',
            budgets: 'id, year',
            // FIX: Added attachments table with indexes
            attachments: 'id, entityId, entityType',
        });
        
        (this as Dexie).on('populate', (tx) => { /* Seed initial data if needed */ });
        
        this.owners.hook('deleting', this.createBlockingHook('ownerId', this.properties, "لا يمكن حذف المالك لوجود عقارات مرتبطة به."));
        this.properties.hook('deleting', this.createBlockingHook('propertyId', this.units, "لا يمكن حذف العقار لوجود وحدات مرتبطة به."));
        this.units.hook('deleting', this.createBlockingHook('unitId', this.contracts, "لا يمكن حذف الوحدة لوجود عقود مرتبطة بها."));
        this.tenants.hook('deleting', this.createBlockingHook('tenantId', this.contracts, "لا يمكن حذف المستأجر لوجود عقود مرتبطة به."));
    }
    
    private createBlockingHook<TKey extends IndexableType>(foreignKey: string, targetTable: Table, errorMessage: string) {
        return async (primKey: TKey) => {
            const count = await targetTable.where(foreignKey).equals(primKey).count();
            if (count > 0) {
                toast.error(`⚠️ ${errorMessage}`);
                throw new Error(errorMessage);
            }
        };
    }

    async getAllData(): Promise<Database> {
        const data: Partial<Database> = {}; const STATIC_ID = 1;
        for (const table of (this as Dexie).tables) {
            if (['settings', 'governance', 'serials'].includes(table.name)) {
                const singleRec = await table.get(STATIC_ID);
                if (singleRec) { const { id, ...rest } = singleRec as any; (data as any)[table.name] = rest; }
            } else if (table.name === 'users') { data.auth = { users: await table.toArray() }; } 
            else { (data as any)[table.name] = await table.toArray(); }
        }
        return data as Database;
    }
}

export const dbEngine = new RentrixDB();