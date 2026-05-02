import { Account, Database, JournalEntry } from '../types';

type AccountType = Account['type'];

interface BalanceSheetLine {
  id: string;
  no: string;
  name: string;
  isParent: boolean;
  balance: number;
  children: BalanceSheetLine[];
}

interface TrialLine {
  id: string;
  no: string;
  name: string;
  type: AccountType;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

interface LedgerLine {
  id: string;
  no: string;
  date: string;
  sourceId: string;
  type: JournalEntry['type'];
  debit: number;
  credit: number;
  amount: number;
  runningBalance: number;
}

const round3 = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 1000) / 1000;
const toNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const safeDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

const isDebitNormal = (type?: AccountType): boolean => type === 'ASSET' || type === 'EXPENSE';

const signedByNormal = (type: AccountType | undefined, debit: number, credit: number): number => {
  if (!type) return round3(debit - credit);
  return isDebitNormal(type) ? round3(debit - credit) : round3(credit - debit);
};

const getArrays = (db: Database) => ({
  accounts: Array.isArray(db?.accounts) ? db.accounts : [],
  journalEntries: Array.isArray(db?.journalEntries) ? db.journalEntries : [],
  invoices: Array.isArray(db?.invoices) ? db.invoices : [],
  receipts: Array.isArray(db?.receipts) ? db.receipts : [],
  contracts: Array.isArray(db?.contracts) ? db.contracts : [],
  tenants: Array.isArray(db?.tenants) ? db.tenants : [],
});

const getEntrySumsByAccount = (
  journalEntries: JournalEntry[],
  predicate: (entry: JournalEntry) => boolean,
): Map<string, { debit: number; credit: number }> => {
  const sums = new Map<string, { debit: number; credit: number }>();

  for (const je of journalEntries) {
    if (!je?.accountId || !predicate(je)) continue;
    const current = sums.get(je.accountId) ?? { debit: 0, credit: 0 };
    const amount = toNumber(je.amount);
    if (je.type === 'DEBIT') current.debit = round3(current.debit + amount);
    if (je.type === 'CREDIT') current.credit = round3(current.credit + amount);
    sums.set(je.accountId, current);
  }

  return sums;
};

export const calculateIncomeStatementData = (db: Database, startDate: string, endDate: string) => {
  try {
    const { accounts, journalEntries } = getArrays(db);
    const start = safeDate(startDate);
    const end = safeDate(endDate);

    if (!start || !end) {
      return { revenues: [], expenses: [], totalRevenue: 0, totalExpense: 0, netIncome: 0 };
    }

    const sums = getEntrySumsByAccount(journalEntries, (je) => {
      const d = safeDate(je?.date);
      return !!d && d >= start && d <= end;
    });

    const revenues = accounts
      .filter((acc) => acc?.type === 'REVENUE')
      .map((acc) => {
        const sum = sums.get(acc.id) ?? { debit: 0, credit: 0 };
        const balance = round3(sum.credit - sum.debit);
        return { id: acc.id, no: acc.no, name: acc.name, balance };
      })
      .filter((line) => Math.abs(line.balance) > 0.0001);

    const expenses = accounts
      .filter((acc) => acc?.type === 'EXPENSE')
      .map((acc) => {
        const sum = sums.get(acc.id) ?? { debit: 0, credit: 0 };
        const balance = round3(sum.debit - sum.credit);
        return { id: acc.id, no: acc.no, name: acc.name, balance };
      })
      .filter((line) => Math.abs(line.balance) > 0.0001);

    const totalRevenue = round3(revenues.reduce((sum, item) => sum + item.balance, 0));
    const totalExpense = round3(expenses.reduce((sum, item) => sum + item.balance, 0));

    return {
      revenues,
      expenses,
      totalRevenue,
      totalExpense,
      netIncome: round3(totalRevenue - totalExpense),
    };
  } catch {
    return { revenues: [], expenses: [], totalRevenue: 0, totalExpense: 0, netIncome: 0 };
  }
};

export const calculateTrialBalanceData = (db: Database, endDate: string) => {
  try {
    const { accounts, journalEntries } = getArrays(db);
    const end = safeDate(endDate);
    if (!end) {
      return { lines: [] as TrialLine[], totalDebit: 0, totalCredit: 0, isBalanced: true };
    }

    const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));
    const sums = getEntrySumsByAccount(journalEntries, (je) => {
      const d = safeDate(je?.date);
      return !!d && d <= end;
    });

    const lines: TrialLine[] = [];

    sums.forEach((sum, accountId) => {
      const account = accountMap.get(accountId);
      if (!account) return;

      const totalDebit = round3(sum.debit);
      const totalCredit = round3(sum.credit);
      const netBalance = signedByNormal(account.type, totalDebit, totalCredit);

      if (Math.abs(totalDebit) < 0.0001 && Math.abs(totalCredit) < 0.0001) return;

      lines.push({
        id: account.id,
        no: account.no,
        name: account.name,
        type: account.type,
        totalDebit,
        totalCredit,
        netBalance,
      });
    });

    lines.sort((a, b) => a.no.localeCompare(b.no, 'en'));

    const totalDebit = round3(lines.reduce((sum, line) => sum + line.totalDebit, 0));
    const totalCredit = round3(lines.reduce((sum, line) => sum + line.totalCredit, 0));

    return {
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
    };
  } catch {
    return { lines: [] as TrialLine[], totalDebit: 0, totalCredit: 0, isBalanced: true };
  }
};

export const calculateGeneralLedgerForAccount = (db: Database, accountId: string, startDate: string, endDate: string) => {
  try {
    const { accounts, journalEntries } = getArrays(db);
    const account = accounts.find((acc) => acc.id === accountId);
    const start = safeDate(startDate);
    const end = safeDate(endDate);

    if (!account || !start || !end) return [] as LedgerLine[];

    let runningBalance = 0;

    const entries = journalEntries
      .filter((je) => {
        const d = safeDate(je?.date);
        return je?.accountId === accountId && !!d && d >= start && d <= end;
      })
      .sort((a, b) => {
        const da = safeDate(a.date)?.getTime() ?? 0;
        const dbt = safeDate(b.date)?.getTime() ?? 0;
        if (da !== dbt) return da - dbt;
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      })
      .map((je) => {
        const debit = je.type === 'DEBIT' ? toNumber(je.amount) : 0;
        const credit = je.type === 'CREDIT' ? toNumber(je.amount) : 0;
        runningBalance = round3(runningBalance + signedByNormal(account.type, debit, credit));

        return {
          id: je.id,
          no: je.no,
          date: je.date,
          sourceId: je.sourceId,
          type: je.type,
          debit: round3(debit),
          credit: round3(credit),
          amount: round3(toNumber(je.amount)),
          runningBalance,
        };
      });

    return entries;
  } catch {
    return [] as LedgerLine[];
  }
};

const getChildrenMap = (accounts: Account[]) => {
  const childrenMap = new Map<string, string[]>();
  for (const acc of accounts) {
    const parentId = (acc.parentId ?? '').toString().trim();
    if (!parentId) continue;
    const children = childrenMap.get(parentId) ?? [];
    children.push(acc.id);
    childrenMap.set(parentId, children);
  }
  return childrenMap;
};

const getAccountWithChildrenBalance = (
  accountId: string,
  accountsMap: Map<string, Account>,
  sums: Map<string, { debit: number; credit: number }>,
  childrenMap: Map<string, string[]>,
): number => {
  const acc = accountsMap.get(accountId);
  if (!acc) return 0;
  const own = sums.get(accountId) ?? { debit: 0, credit: 0 };
  let total = signedByNormal(acc.type, own.debit, own.credit);
  const children = childrenMap.get(accountId) ?? [];
  for (const childId of children) {
    total = round3(total + getAccountWithChildrenBalance(childId, accountsMap, sums, childrenMap));
  }
  return round3(total);
};

const buildHierarchy = (
  roots: Account[],
  accountsMap: Map<string, Account>,
  sums: Map<string, { debit: number; credit: number }>,
  childrenMap: Map<string, string[]>,
): BalanceSheetLine[] =>
  roots
    .map((acc) => {
      const children = (childrenMap.get(acc.id) ?? [])
        .map((childId) => accountsMap.get(childId))
        .filter((child): child is Account => !!child);

      const nodeChildren = buildHierarchy(children, accountsMap, sums, childrenMap);
      const balance = getAccountWithChildrenBalance(acc.id, accountsMap, sums, childrenMap);

      return {
        id: acc.id,
        no: acc.no,
        name: acc.name,
        isParent: !!acc.isParent,
        balance: round3(balance),
        children: nodeChildren,
      };
    })
    .filter((line) => Math.abs(line.balance) > 0.0001 || line.children.length > 0)
    .sort((a, b) => a.no.localeCompare(b.no, 'en'));

const calculateTypeToDate = (
  type: AccountType,
  accounts: Account[],
  sums: Map<string, { debit: number; credit: number }>,
): number => {
  return round3(
    accounts
      .filter((acc) => acc.type === type)
      .reduce((sum, acc) => {
        const line = sums.get(acc.id) ?? { debit: 0, credit: 0 };
        const balance = type === 'REVENUE' ? round3(line.credit - line.debit) : round3(line.debit - line.credit);
        return round3(sum + balance);
      }, 0),
  );
};

export const calculateBalanceSheetData = (db: Database, asOfDate: string) => {
  try {
    const { accounts, journalEntries } = getArrays(db);
    const end = safeDate(asOfDate);
    if (!end) {
      return { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
    }

    const sums = getEntrySumsByAccount(journalEntries, (je) => {
      const d = safeDate(je?.date);
      return !!d && d <= end;
    });

    const accountsMap = new Map(accounts.map((acc) => [acc.id, acc]));
    const childrenMap = getChildrenMap(accounts);
    const isRoot = (acc: Account): boolean => !acc.parentId || acc.parentId === '' || acc.parentId === null;

    const assets = buildHierarchy(accounts.filter((acc) => acc.type === 'ASSET' && isRoot(acc)), accountsMap, sums, childrenMap);
    const liabilities = buildHierarchy(accounts.filter((acc) => acc.type === 'LIABILITY' && isRoot(acc)), accountsMap, sums, childrenMap);
    const equity = buildHierarchy(accounts.filter((acc) => acc.type === 'EQUITY' && isRoot(acc)), accountsMap, sums, childrenMap);

    const revenueToDate = calculateTypeToDate('REVENUE', accounts, sums);
    const expenseToDate = calculateTypeToDate('EXPENSE', accounts, sums);
    const currentEarnings = round3(revenueToDate - expenseToDate);

    if (Math.abs(currentEarnings) > 0.0001) {
      equity.push({ id: '__current_earnings__', no: 'CURRENT', name: 'Current Earnings', isParent: false, balance: currentEarnings, children: [] });
    }

    const totalAssets = round3(assets.reduce((sum, item) => sum + item.balance, 0));
    const totalLiabilities = round3(liabilities.reduce((sum, item) => sum + item.balance, 0));
    const totalEquity = round3(equity.reduce((sum, item) => sum + item.balance, 0));

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
  } catch {
    return { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
  }
};

export interface FinancialConsistencyReport {
  trialBalance: { status: 'BALANCED' | 'NOT_BALANCED'; totalDebit: number; totalCredit: number; discrepancy: number };
  incomeStatement: { status: 'VERIFIED' | 'MISMATCH'; reportRevenue: number; expectedRevenue: number; reportExpense: number; expectedExpense: number; reportNetIncome: number; expectedNetIncome: number };
  balanceSheet: { status: 'VALID' | 'INVALID'; totalAssets: number; totalLiabilities: number; totalEquity: number; discrepancy: number };
  crossChecks: { postedReceipts: number; invoicesPaidAmount: number; activeContracts: number; postedReceiptCount: number; openInvoiceCount: number };
}

export const validateFinancialConsistency = (db: Database, startDate: string, endDate: string, asOfDate: string): FinancialConsistencyReport => {
  const { accounts, journalEntries, invoices, receipts, contracts } = getArrays(db);
  const trial = calculateTrialBalanceData(db, asOfDate);
  const income = calculateIncomeStatementData(db, startDate, endDate);
  const balance = calculateBalanceSheetData(db, asOfDate);

  const start = safeDate(startDate);
  const end = safeDate(endDate);
  const sums = getEntrySumsByAccount(journalEntries, (je) => {
    const d = safeDate(je?.date);
    return !!d && !!start && !!end && d >= start && d <= end;
  });

  const expectedRevenue = calculateTypeToDate('REVENUE', accounts, sums);
  const expectedExpense = calculateTypeToDate('EXPENSE', accounts, sums);
  const expectedNetIncome = round3(expectedRevenue - expectedExpense);

  const incomeVerified = Math.abs(income.totalRevenue - expectedRevenue) < 0.001 && Math.abs(income.totalExpense - expectedExpense) < 0.001 && Math.abs(income.netIncome - expectedNetIncome) < 0.001;
  const balanceDiscrepancy = round3(balance.totalAssets - (balance.totalLiabilities + balance.totalEquity));

  const asOf = safeDate(asOfDate);
  const postedReceipts = round3(receipts.reduce((sum, r) => {
    const d = safeDate(r?.dateTime);
    return (r?.status === 'POSTED' && d && (!asOf || d <= asOf)) ? round3(sum + toNumber(r.amount)) : sum;
  }, 0));

  return {
    trialBalance: { status: trial.isBalanced ? 'BALANCED' : 'NOT_BALANCED', totalDebit: trial.totalDebit, totalCredit: trial.totalCredit, discrepancy: round3(trial.totalDebit - trial.totalCredit) },
    incomeStatement: { status: incomeVerified ? 'VERIFIED' : 'MISMATCH', reportRevenue: income.totalRevenue, expectedRevenue, reportExpense: income.totalExpense, expectedExpense, reportNetIncome: income.netIncome, expectedNetIncome },
    balanceSheet: { status: Math.abs(balanceDiscrepancy) < 0.001 ? 'VALID' : 'INVALID', totalAssets: balance.totalAssets, totalLiabilities: balance.totalLiabilities, totalEquity: balance.totalEquity, discrepancy: balanceDiscrepancy },
    crossChecks: {
      postedReceipts,
      invoicesPaidAmount: round3(invoices.reduce((sum, inv) => round3(sum + toNumber(inv.paidAmount)), 0)),
      activeContracts: contracts.filter((c) => c.status === 'ACTIVE' && !c.deletedAt).length,
      postedReceiptCount: receipts.filter((r) => r.status === 'POSTED').length,
      openInvoiceCount: invoices.filter((i) => i.status !== 'PAID').length,
    },
  };
};

const getInvoiceRemaining = (invoice: any) => round3(toNumber(invoice.amount) + toNumber(invoice.taxAmount) - toNumber(invoice.paidAmount));

const getBucketForDays = (days: number) => {
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
};

export const calculateAgedReceivables = (db: Database, asOfDate: string) => {
  try {
    const { invoices, contracts, tenants } = getArrays(db);
    const asOf = safeDate(asOfDate);
    if (!asOf) return { lines: [], totals: { total: 0, current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } };

    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
    const contractMap = new Map(contracts.map((c) => [c.id, c]));
    const bucketsByTenant = new Map<string, any>();

    for (const inv of invoices) {
      const dueDate = safeDate(inv?.dueDate);
      if (!dueDate || dueDate > asOf || inv?.status === 'PAID') continue;
      const remaining = getInvoiceRemaining(inv);
      if (remaining <= 0) continue;
      const contract = contractMap.get(inv.contractId);
      if (!contract) continue;

      const tenantId = contract.tenantId;
      const entry = bucketsByTenant.get(tenantId) ?? { tenantName: tenantMap.get(tenantId) ?? 'غير معروف', current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
      const days = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = getBucketForDays(days);
      entry[bucket] = round3(entry[bucket] + remaining);
      entry.total = round3(entry.total + remaining);
      bucketsByTenant.set(tenantId, entry);
    }

    const lines = Array.from(bucketsByTenant.values()).filter((l) => l.total > 0).sort((a, b) => b.total - a.total);
    const totals = lines.reduce((acc, l) => ({
      total: round3(acc.total + l.total),
      current: round3(acc.current + l.current),
      '1-30': round3(acc['1-30'] + l['1-30']),
      '31-60': round3(acc['31-60'] + l['31-60']),
      '61-90': round3(acc['61-90'] + l['61-90']),
      '90+': round3(acc['90+'] + l['90+']),
    }), { total: 0, current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });

    return { lines, totals };
  } catch {
    return { lines: [], totals: { total: 0, current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } };
  }
};

export const getAccountingHealthCheck = (db: Database) => {
  try {
    const { accounts, journalEntries } = getArrays(db);
    const debitTotal = round3(journalEntries.filter((je) => je?.type === 'DEBIT').reduce((sum, je) => sum + toNumber(je.amount), 0));
    const creditTotal = round3(journalEntries.filter((je) => je?.type === 'CREDIT').reduce((sum, je) => sum + toNumber(je.amount), 0));
    const discrepancy = round3(debitTotal - creditTotal);
    return { isBalanced: Math.abs(discrepancy) < 0.001, discrepancy, journalCount: journalEntries.length, accountCount: accounts.length };
  } catch {
    return { isBalanced: false, discrepancy: 0, journalCount: 0, accountCount: 0 };
  }
};
