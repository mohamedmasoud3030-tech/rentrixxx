import { Database, DerivedData, Invoice, Receipt, OwnerBalance, JournalEntry, AccountBalance, KpiSnapshot, ContractBalance, TenantBalance, OwnerSettlement } from '../types';
import { dbEngine } from './db';
import Dexie, { Transaction } from 'dexie';

const STATIC_ID = 1;

// FIX: Add postJournalEntry function and export it to resolve import error in AppContext.
export const postJournalEntry = async (
    tx: Transaction,
    { dr, cr, amount, ref, no, entityType, entityId }: { dr: string, cr: string, amount: number, ref: string, no?: string, entityType?: 'CONTRACT' | 'TENANT', entityId?: string }
): Promise<JournalEntry[]> => {
    let finalNo = no;
    if (!finalNo) {
        const serialsTable = tx.table('serials');
        const currentSerials = await serialsTable.get(STATIC_ID);
        if (!currentSerials) throw new Error("Serials not found!");
        finalNo = String(currentSerials.journalEntry + 1);
        await serialsTable.update(STATIC_ID, { 'journalEntry': Number(finalNo) });
    }

    const now = new Date().toISOString().slice(0, 10);
    const timestamp = Date.now();

    const entryData = { no: finalNo, date: now, sourceId: ref, createdAt: timestamp, entityType, entityId };
    const debitEntry: JournalEntry = { id: crypto.randomUUID(), ...entryData, accountId: dr, amount, type: 'DEBIT' as const };
    const creditEntry: JournalEntry = { id: crypto.randomUUID(), ...entryData, accountId: cr, amount, type: 'CREDIT' as const };
    
    await tx.table('journalEntries').bulkAdd([debitEntry, creditEntry]);
    return [debitEntry, creditEntry];
};

// --- Functions for Accounting & Financial Calculations ---

export const calculateFinancials = (amount: number, vatRate: number = 0.05) => {
  const vatAmount = amount * (vatRate);
  const totalWithVat = amount + vatAmount;
  return {
    net: Number(amount.toFixed(3)),
    vat: Number(vatAmount.toFixed(3)),
    total: Number(totalWithVat.toFixed(3))
  };
};

export interface OfficePandLData {
    revenue: number;
    officeExpenses: number;
    netProfit: number;
}

const n = (x: any): number => {
    const v = Number(x);
    return isFinite(v) ? v : 0;
};

const r3 = (x: number): number => +x.toFixed(3);

const createMap = <T extends { id: string }>(arr: T[]): Map<string, T> => new Map(arr.map(item => [item.id, item]));

export async function rebuildAccountBalancesSnapshot(tx: Transaction, db: Database): Promise<void> {
    const balances = new Map<string, number>();
    db.accounts.forEach(acc => balances.set(acc.id, 0));

    db.journalEntries.forEach(je => {
        const amount = je.type === 'DEBIT' ? je.amount : -je.amount;
        balances.set(je.accountId, (balances.get(je.accountId) || 0) + amount);
    });

    const finalBalances: AccountBalance[] = Array.from(balances.entries()).map(([accountId, balance]) => ({
        accountId,
        balance: r3(balance)
    }));

    await tx.table('accountBalances').clear();
    await tx.table('accountBalances').bulkPut(finalBalances);
}


/**
 * Rebuilds the entire ownerBalances snapshot table from the single source of truth: the journal.
 * It MUST NOT read financial amounts from receipts, expenses, etc.
 * It also calculates and updates the totalOwnerNetBalance in kpiSnapshots.
 */
export async function rebuildOwnerBalancesSnapshot(tx: Transaction, db: Database): Promise<void> {
    const { settings } = db;
    const ownerBalances = new Map<string, OwnerBalance>();
    db.owners.forEach(o => ownerBalances.set(o.id, { ownerId: o.id, collections: 0, expenses: 0, settlements: 0, officeShare: 0, net: 0 }));

    const receiptsMap = createMap(db.receipts);
    const expensesMap = createMap(db.expenses);
    const settlementsMap = createMap(db.ownerSettlements);
    const contractsMap = createMap(db.contracts);
    const unitsMap = createMap(db.units);
    const propertiesMap = createMap(db.properties);

    const utilityRecordsMap = createMap(db.utilityRecords || []);

    const getOwnerForSource = (sourceId: string): string | null => {
        if (settlementsMap.has(sourceId)) return settlementsMap.get(sourceId)!.ownerId;
        const sourceTx = receiptsMap.get(sourceId) || expensesMap.get(sourceId);
        if (!sourceTx) return null;
        if (sourceTx.contractId) {
            const contract = contractsMap.get(sourceTx.contractId); if (!contract) return null;
            const unit = unitsMap.get(contract.unitId); if (!unit) return null;
            const property = propertiesMap.get(unit.propertyId); return property ? property.ownerId : null;
        }
        if (sourceTx.ownerId) return sourceTx.ownerId;
        if (sourceTx.propertyId) {
            const property = propertiesMap.get(sourceTx.propertyId); return property ? property.ownerId : null;
        }
        if (sourceTx.ref && sourceTx.ref.startsWith('UTIL-')) {
            const utilRefPrefix = sourceTx.ref.slice(5);
            const utilRecord = Array.from(utilityRecordsMap.values()).find(r => r.id.startsWith(utilRefPrefix));
            if (utilRecord) {
                const unit = unitsMap.get(utilRecord.unitId);
                if (unit) { const property = propertiesMap.get(unit.propertyId); return property ? property.ownerId : null; }
            }
        }
        return null;
    };

    for (const je of db.journalEntries) {
        const ownerId = getOwnerForSource(je.sourceId);
        if (!ownerId) continue;
        const balance = ownerBalances.get(ownerId);
        if (!balance) continue;
        
        if (je.accountId === settings.accounting.accountMappings.ownersPayable) {
            const amount = je.type === 'CREDIT' ? je.amount : -je.amount;
            balance.net += amount;
            if (receiptsMap.has(je.sourceId)) balance.collections += je.amount;
            else if (expensesMap.has(je.sourceId)) balance.expenses += je.amount;
            else if (settlementsMap.has(je.sourceId)) balance.settlements += je.amount;
        } else if (je.accountId === settings.accounting.accountMappings.revenue.OFFICE_COMMISSION) {
            balance.officeShare += je.amount;
            balance.net -= je.amount;
        }
    }

    let totalOwnerNetBalance = 0;
    const finalBalances: OwnerBalance[] = [];
    ownerBalances.forEach(b => {
        const finalBalance = { ...b, net: r3(b.net) };
        finalBalances.push(finalBalance);
        totalOwnerNetBalance += finalBalance.net;
    });

    await tx.table('ownerBalances').clear();
    await tx.table('ownerBalances').bulkPut(finalBalances);
    const kpiSnapshot = (await tx.table('kpiSnapshots').get('main')) || { id: 'main' };
    await tx.table('kpiSnapshots').put({ ...kpiSnapshot, totalOwnerNetBalance: r3(totalOwnerNetBalance) });
}

export async function rebuildContractBalancesSnapshot(tx: Transaction, db: Database): Promise<void> {
    const arAccount = db.settings.accounting.accountMappings.accountsReceivable;
    const balances = new Map<string, number>();
    
    db.journalEntries.forEach(je => {
        if (je.accountId === arAccount && je.entityType === 'CONTRACT' && je.entityId) {
            const amount = je.type === 'DEBIT' ? je.amount : -je.amount;
            balances.set(je.entityId, (balances.get(je.entityId) || 0) + amount);
        }
    });

    const contractsMap = createMap(db.contracts);
    const finalBalances: ContractBalance[] = [];
    let totalContractARBalance = 0;

    balances.forEach((balance, contractId) => {
        const contract = contractsMap.get(contractId);
        if (contract) {
            finalBalances.push({
                contractId,
                tenantId: contract.tenantId,
                unitId: contract.unitId,
                balance: r3(balance),
                depositBalance: 0, // Note: Deposit balance logic is not part of this phase
                lastUpdatedAt: Date.now()
            });
            totalContractARBalance += balance;
        }
    });

    await tx.table('contractBalances').clear();
    await tx.table('contractBalances').bulkPut(finalBalances);
    const kpiSnapshot = (await tx.table('kpiSnapshots').get('main')) || { id: 'main' };
    await tx.table('kpiSnapshots').put({ ...kpiSnapshot, totalContractARBalance: r3(totalContractARBalance) });
}

export async function rebuildTenantBalancesSnapshot(tx: Transaction, db: Database): Promise<void> {
    const arAccount = db.settings.accounting.accountMappings.accountsReceivable;
    const balances = new Map<string, number>();
    
    const contractsMap = createMap(db.contracts);

    db.journalEntries.forEach(je => {
        // Handle both direct tenant entries and legacy contract entries
        let tenantId: string | undefined;
        if (je.entityType === 'TENANT' && je.entityId) {
            tenantId = je.entityId;
        } else if (je.entityType === 'CONTRACT' && je.entityId) {
            const contract = contractsMap.get(je.entityId);
            if (contract) {
                tenantId = contract.tenantId;
            }
        }
        
        if (je.accountId === arAccount && tenantId) {
            const amount = je.type === 'DEBIT' ? je.amount : -je.amount;
            balances.set(tenantId, (balances.get(tenantId) || 0) + amount);
        }
    });

    const finalBalances: TenantBalance[] = [];
    let totalTenantARBalance = 0;

    balances.forEach((balance, tenantId) => {
        finalBalances.push({
            tenantId,
            balance: r3(balance),
            lastUpdatedAt: Date.now()
        });
        totalTenantARBalance += balance;
    });

    await tx.table('tenantBalances').clear();
    await tx.table('tenantBalances').bulkPut(finalBalances);
    const kpiSnapshot = (await tx.table('kpiSnapshots').get('main')) || { id: 'main' };
    await tx.table('kpiSnapshots').put({ ...kpiSnapshot, totalTenantARBalance: r3(totalTenantARBalance) });
}


export async function rebuildSnapshotsFromJournal(): Promise<void> {
    const db = await dbEngine.getAllData();
    if (!db) return;
    
    await (dbEngine as Dexie).transaction('rw', [dbEngine.ownerBalances, dbEngine.accountBalances, dbEngine.kpiSnapshots, dbEngine.contractBalances, dbEngine.tenantBalances], async (tx) => {
        await tx.table('kpiSnapshots').clear();
        await tx.table('kpiSnapshots').put({id: 'main', totalOwnerNetBalance: 0, totalContractARBalance: 0, totalTenantARBalance: 0 });
        await rebuildAccountBalancesSnapshot(tx, db);
        await rebuildOwnerBalancesSnapshot(tx, db);
        await rebuildContractBalancesSnapshot(tx, db);
        await rebuildTenantBalancesSnapshot(tx, db);
    });
}