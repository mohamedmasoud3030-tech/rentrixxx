
import { Database } from '../types';
import { formatCurrency } from '../utils/helpers';

// Helper function to safely get a number
const n = (val: unknown) => typeof val === 'number' && isFinite(val) ? val : 0;

// Helper to calculate balance of an account and its children
const getAccountBalance = (accountId: string, balances: Map<string, number>, accounts: Map<string, Database['accounts'][number]>, childrenMap: Map<string, string[]>) => {
    let total = balances.get(accountId) || 0;
    const children = childrenMap.get(accountId);
    if (children) {
        children.forEach(childId => {
            total += getAccountBalance(childId, balances, accounts, childrenMap);
        });
    }
    return total;
};


export const calculateIncomeStatementData = (db: Database, startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const balances = new Map<string, number>();

    db.accounts.forEach(acc => balances.set(acc.id, 0));
    
    db.journalEntries
      .filter(je => { const d = new Date(je.date); return d >= start && d <= end; })
      .forEach(je => {
        const currentBalance = balances.get(je.accountId) || 0;
        const amount = je.type === 'DEBIT' ? je.amount : -je.amount;
        balances.set(je.accountId, currentBalance + amount);
    });

    const revenueAccounts = db.accounts.filter(acc => acc.type === 'REVENUE');
    const expenseAccounts = db.accounts.filter(acc => acc.type === 'EXPENSE');

    const revenues = revenueAccounts.map(acc => ({ no: acc.no, name: acc.name, balance: -n(balances.get(acc.id)) })).filter(r => r.balance !== 0);
    const expenses = expenseAccounts.map(acc => ({ no: acc.no, name: acc.name, balance: n(balances.get(acc.id)) })).filter(e => e.balance !== 0);

    const totalRevenue = revenues.reduce((sum, item) => sum + item.balance, 0);
    const totalExpense = expenses.reduce((sum, item) => sum + item.balance, 0);
    
    return {
        revenues,
        expenses,
        totalRevenue,
        totalExpense,
        netIncome: totalRevenue - totalExpense,
    };
};


export const calculateBalanceSheetData = (db: Database, asOfDate: string) => {
    const end = new Date(asOfDate);
    const balances = new Map<string, number>();
    db.accounts.forEach(acc => balances.set(acc.id, 0));

    // Calculate balances up to the given date
    db.journalEntries
      .filter(je => new Date(je.date) <= end)
      .forEach(je => {
        const currentBalance = balances.get(je.accountId) || 0;
        const amount = je.type === 'DEBIT' ? je.amount : -je.amount;
        balances.set(je.accountId, currentBalance + amount);
    });

    const accountsMap = new Map(db.accounts.map(acc => [acc.id, acc]));
    const childrenMap = new Map<string, string[]>();
    db.accounts.forEach(acc => {
        if (acc.parentId) {
            if (!childrenMap.has(acc.parentId)) childrenMap.set(acc.parentId, []);
            childrenMap.get(acc.parentId)!.push(acc.id);
        }
    });

    const buildHierarchy = (accountIds: string[], type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE') => {
        return accountIds.map(id => {
            const account = accountsMap.get(id)!;
            const rawBalance = getAccountBalance(id, balances, accountsMap, childrenMap);
            // Assets and Expenses: Debit balance is positive
            // Liabilities, Equity, Revenue: Credit balance is positive
            const balance = (type === 'ASSET' || type === 'EXPENSE') ? rawBalance : -rawBalance;
            
            const children = childrenMap.get(id);
            return {
                no: account.no,
                name: account.name,
                isParent: account.isParent,
                balance,
                children: children ? buildHierarchy(children, type) : [],
            };
        }).filter(acc => Math.abs(acc.balance) > 0.001 || acc.children.length > 0);
    };

    const rootAssets = db.accounts.filter(a => a.type === 'ASSET' && !a.parentId).map(a => a.id);
    const rootLiabilities = db.accounts.filter(a => a.type === 'LIABILITY' && !a.parentId).map(a => a.id);
    const rootEquity = db.accounts.filter(a => a.type === 'EQUITY' && !a.parentId).map(a => a.id);

    const assets = buildHierarchy(rootAssets, 'ASSET');
    const liabilities = buildHierarchy(rootLiabilities, 'LIABILITY');
    const equity = buildHierarchy(rootEquity, 'EQUITY');

    const totalAssets = assets.reduce((sum, item) => sum + item.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.balance, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.balance, 0);

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
};

export const calculateAgedReceivables = (db: Database, asOfDate: string) => {
    const asOf = new Date(asOfDate);
    const tenantBalances = new Map<string, { tenantName: string, buckets: { [key: string]: number } }>();

    db.tenants.forEach(t => {
        tenantBalances.set(t.id, {
            tenantName: t.name,
            buckets: { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 }
        });
    });

    db.invoices.forEach(invoice => {
        if (new Date(invoice.dueDate) > asOf || invoice.status === 'PAID') return;

        const remainingBalance = (invoice.amount + (invoice.taxAmount || 0)) - invoice.paidAmount;
        if (remainingBalance <= 0) return;

        const contract = db.contracts.find(c => c.id === invoice.contractId);
        if (!contract) return;
        
        const tenantData = tenantBalances.get(contract.tenantId);
        if (!tenantData) return;

        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

        if (daysOverdue <= 0) tenantData.buckets.current += remainingBalance;
        else if (daysOverdue <= 30) tenantData.buckets['1-30'] += remainingBalance;
        else if (daysOverdue <= 60) tenantData.buckets['31-60'] += remainingBalance;
        else if (daysOverdue <= 90) tenantData.buckets['61-90'] += remainingBalance;
        else tenantData.buckets['90+'] += remainingBalance;

        tenantData.buckets.total += remainingBalance;
    });

    // FIX: Explicitly construct object to ensure correct type inference for `lines` array.
    const lines = Array.from(tenantBalances.values())
        .filter(t => t.buckets.total > 0.001)
        .map(t => ({ 
            tenantName: t.tenantName,
            total: t.buckets.total,
            current: t.buckets.current,
            '1-30': t.buckets['1-30'],
            '31-60': t.buckets['31-60'],
            '61-90': t.buckets['61-90'],
            '90+': t.buckets['90+'],
        }))
        .sort((a,b) => b.total - a.total);

    const totals = lines.reduce((acc, line) => {
        acc.total += line.total;
        acc.current += line.current;
        acc['1-30'] += line['1-30'];
        acc['31-60'] += line['31-60'];
        acc['61-90'] += line['61-90'];
        acc['90+'] += line['90+'];
        return acc;
    }, { total: 0, current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });

    return { lines, totals };
};
