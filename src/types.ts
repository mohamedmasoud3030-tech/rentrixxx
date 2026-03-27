// FIX: Add Attachment interface
export interface Attachment {
  id: string;
  entityType: 'TENANT' | 'CONTRACT' | 'RECEIPT' | 'EXPENSE' | 'OWNER' | 'PROPERTY' | 'UNIT' | 'UTILITY';
  entityId: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string; // base64
  createdAt: number;
}

export type UtilityType = 'WATER' | 'ELECTRICITY' | 'GAS' | 'INTERNET' | 'OTHER';

export const UTILITY_TYPE_AR: Record<UtilityType, string> = {
  WATER: 'مياه',
  ELECTRICITY: 'كهرباء',
  GAS: 'غاز',
  INTERNET: 'إنترنت',
  OTHER: 'أخرى',
};

export const UTILITY_ICON: Record<UtilityType, string> = {
  WATER: '💧',
  ELECTRICITY: '⚡',
  GAS: '🔥',
  INTERNET: '🌐',
  OTHER: '🔧',
};

export interface UtilityRecord {
  id: string;
  unitId: string;
  propertyId: string;
  type: UtilityType;
  month: string; // YYYY-MM
  previousReading: number;
  currentReading: number;
  unitPrice: number;
  amount: number; // calculated: consumption * unitPrice
  paidBy: 'TENANT' | 'OWNER' | 'OFFICE';
  billImageUrl?: string; // base64 image of bill
  billImageMime?: string;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}


export interface User {
  id: string;
  username: string;
  email: string;
  hash: string;
  salt: string;
  role: 'ADMIN' | 'USER';
  mustChange: boolean;
  createdAt: number;
  isDemo?: boolean;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  phone2?: string;
  email?: string;
  postalCode?: string;
  crNumber?: string;
  taxNumber?: string;
}

export interface MaintenanceSettings {
    defaultChargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
}

export interface AutoBackupSettings {
    isEnabled: boolean;
    passphraseIsSet: boolean; // UI flag, not stored
    lastBackupTime: number | null;
    lastBackupStatus: 'PASS' | 'FAIL' | null;
    operationCounter: number;
    operationsThreshold: number;
}

export interface DocumentNumberingSettings {
    invoicePrefix: string;
    receiptPrefix: string;
    expensePrefix: string;
    contractPrefix: string;
}

export interface SecuritySettings {
    sessionTimeout: number; // in minutes, 0 for no timeout
}


export interface Settings {
  general: {
    company: CompanyInfo;
  };
  operational: {
    currency: 'OMR' | 'SAR' | 'EGP';
    taxRate: number;
    contractAlertDays: number;
    lateFee: {
      isEnabled: boolean;
      type: 'FIXED_AMOUNT' | 'PERCENTAGE_OF_RENT';
      value: number;
      graceDays: number;
    };
    documentNumbering: DocumentNumberingSettings;
    maintenance: MaintenanceSettings;
  };
  accounting: {
     accountMappings: {
        paymentMethods: {
            CASH: string;
            BANK: string;
            POS: string;
            CHECK: string;
            OTHER: string;
        },
        expenseCategories: {
            [key: string]: string; // Maps category name to account ID
            default: string;
        },
        revenue: {
            RENT: string;
            OFFICE_COMMISSION: string;
        },
        accountsReceivable: string;
        vatPayable: string;
        vatReceivable: string;
        ownersPayable: string;
      };
  };
  appearance: {
    theme: 'light' | 'dark';
    primaryColor: string;
    logoDataUrl?: string;
    stampDataUrl?: string;
  };
  backup: {
    autoBackup: AutoBackupSettings;
  };
  security: SecuritySettings;
  integrations: {
    geminiApiKey: string;
    googleClientId?: string;
    googleDriveSync: {
      isEnabled: boolean;
      lastSync?: string;
    };
  };
  documentTemplates: {
    contractClauses: string[];
    contractFooterNote: string;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    includeSignatures?: boolean;
    signatureBlockCount?: number;
  };
}

export interface LegacySettings {
  company?: CompanyInfo;
  currency?: 'OMR' | 'SAR' | 'EGP';
  taxRate?: number;
  contractAlertDays?: number;
  lateFee?: Settings['operational']['lateFee'];
  documentNumbering?: DocumentNumberingSettings;
  maintenance?: MaintenanceSettings;
  accountMappings?: Settings['accounting']['accountMappings'];
  theme?: 'light' | 'dark';
  geminiApiKey?: string;
  googleClientId?: string;
  googleDriveSync?: { isEnabled: boolean; lastSync?: string };
  autoBackup?: AutoBackupSettings;
  security?: SecuritySettings;
  appearance?: { theme: 'light' | 'dark'; primaryColor: string; logoDataUrl?: string };
}

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  managementContractDate?: string; // YYYY-MM-DD
  notes: string;
  commissionType: 'RATE' | 'FIXED_MONTHLY';
  commissionValue: number;
  createdAt: number;
  updatedAt?: number;
  portalToken?: string; 
  isDemo?: boolean;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  location: string;
  area?: number;
  yearBuilt?: number;
  facilities?: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  isDemo?: boolean;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  type: string;
  floor?: string;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'ON_HOLD';
  rentDefault: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  waterMeter?: string;
  electricityMeter?: string;
  features?: string;
  notes: string;
  createdAt: number;
  updatedAt?: number;
  isDemo?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  idNo: string;
  tenantType?: 'INDIVIDUAL' | 'COMPANY';
  crNumber?: string;
  address?: string;
  postalCode?: string;
  poBox?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLIST';
  notes: string;
  createdAt: number;
  updatedAt?: number;
  isDemo?: boolean;
}

export interface Contract {
  id: string;
  no?: string;
  unitId: string;
  tenantId: string;
  rent: number;
  dueDay: number;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  deposit: number;
  status: 'ACTIVE' | 'ENDED' | 'SUSPENDED';
  sponsorName?: string;
  sponsorId?: string;
  sponsorPhone?: string;
  createdAt: number;
  updatedAt?: number;
  isDemo?: boolean;
}

export interface Invoice {
  id: string;
  no: string;
  contractId: string;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  taxAmount?: number;
  paidAmount: number;
  status: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  type: 'RENT' | 'MAINTENANCE' | 'UTILITY' | 'LATE_FEE';
  notes: string;
  relatedInvoiceId?: string;
  createdAt: number;
  updatedAt?: number;
  paymentMethod?: 'Cash' | 'Bank' | 'Online' | 'Other';
  externalPaymentRef?: string;
}

export interface Receipt {
  id: string;
  no: string;
  contractId: string;
  dateTime: string; // ISO format
  channel: 'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER';
  amount: number;
  ref: string;
  notes: string;
  status: 'POSTED' | 'VOID';
  checkNumber?: string;
  checkBank?: string;
  checkDate?: string;
  checkStatus?: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
  createdAt: number;
  updatedAt?: number;
  voidedAt?: number;
}

export interface ReceiptAllocation {
  id: string;
  receiptId: string;
  invoiceId: string;
  amount: number;
  createdAt: number;
}

export interface Expense {
    id: string;
    no: string;
    contractId: string | null;
    payee?: string;
    dateTime: string; // ISO format
    category: string;
    amount: number;
    taxAmount?: number;
    ref: string;
    notes: string;
    status: 'POSTED' | 'VOID';
    chargedTo?: 'OWNER' | 'OFFICE' | 'TENANT';
    createdAt: number;
    updatedAt?: number;
    voidedAt?: number;
}

export interface MaintenanceRecord {
    id: string;
    no: string;
    unitId: string;
    requestDate: string; // YYYY-MM-DD
    description: string;
    status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
    cost: number;
    chargedTo: 'OWNER' | 'OFFICE' | 'TENANT';
    expenseId?: string;
    invoiceId?: string;
    createdAt: number;
    completedAt?: number;
}

export interface DepositTx {
  id: string;
  contractId: string;
  date: string;
  type: 'DEPOSIT_IN' | 'DEPOSIT_DEDUCT' | 'DEPOSIT_RETURN';
  amount: number;
  note: string;
  createdAt: number;
}

export interface AuditLogEntry {
    id: string;
    ts: number;
    userId: string;
    username: string;
    action: string;
    entity: string;
    entityId: string;
    note: string;
}

export interface Governance {
    readOnly: boolean;
    lockedPeriods: string[]; // YYYY-MM
}

export interface OwnerSettlement {
    id: string;
    no: string;
    ownerId: string;
    date: string; // YYYY-MM-DD
    amount: number;
    method: 'CASH' | 'BANK' | 'OTHER';
    ref: string;
    notes: string;
    createdAt: number;
    updatedAt?: number;
}

export interface Account {
    id: string;
    no: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    isParent: boolean;
    parentId: string | null;
    createdAt: number;
}

export interface JournalEntry {
    id: string;
    no: string;
    date: string;
    accountId: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    sourceId: string;
    entityType?: 'CONTRACT' | 'TENANT';
    entityId?: string;
    createdAt: number;
}

export interface Serials {
    [key: string]: number;
    receipt: number;
    expense: number;
    maintenance: number;
    invoice: number;
    ownerSettlement: number;
    journalEntry: number;
    lead: number;
    mission: number;
    contract: number;
}

export interface Snapshot {
  id: string;
  ts: number;
  note: string;
  data: any;
}

export interface OwnerBalance {
    ownerId: string;
    collections: number;
    expenses: number;
    settlements: number;
    officeShare: number;
    net: number;
}

export interface AccountBalance {
    accountId: string;
    balance: number;
}

export interface KpiSnapshot {
    id: 'main';
    totalOwnerNetBalance: number;
    totalContractARBalance: number;
    totalTenantARBalance: number;
}

export interface ContractBalance {
    contractId: string;
    tenantId: string;
    unitId: string;
    balance: number;
    depositBalance: number;
    lastUpdatedAt: number;
}

export interface TenantBalance {
    tenantId: string;
    balance: number;
    lastUpdatedAt: number;
}

export interface EncryptedBackup {
    backupVersion: number;
    salt: string;
    iv: string;
    ciphertext: string;
}

export interface AutoBackup {
    id: 'latest';
    timestamp: number;
    data: EncryptedBackup;
}
export interface NotificationTemplate {
  id: 'RENT_OVERDUE' | 'CONTRACT_EXPIRING' | string;
  name: string;
  template: string;
  isEnabled: boolean;
}

export interface OutgoingNotification {
    id: string;
    createdAt: number;
    status: 'PENDING' | 'SENT';
    recipientName: string;
    recipientContact: string; // phone number
    message: string;
}

export type NotificationType = 'CONTRACT_EXPIRING' | 'OVERDUE_BALANCE' | 'DIAGNOSTIC_ERROR' | 'BACKUP_FAILED';

export interface AppNotification {
    id: string;
    createdAt: number;
    isRead: boolean;
    role: 'ADMIN' | 'ALL';
    type: NotificationType;
    title: string;
    message: string;
    link: string;
}

export interface Lead {
    id: string;
    no: string;
    name: string;
    phone: string;
    email?: string;
    status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'NOT_INTERESTED' | 'CLOSED';
    desiredUnitType?: string;
    minBudget?: number;
    maxBudget?: number;
    notes: string;
    createdAt: number;
    updatedAt?: number;
}

export interface Land {
    id: string;
    plotNo: string;
    name: string;
    location: string;
    area: number;
    category: 'سكني' | 'تجاري' | 'صناعي';
    status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
    ownerPrice: number;
    commission: number;
    notes: string;
    createdAt: number;
    updatedAt?: number;
}

export interface Commission {
    id: string;
    staffId: string;
    type: 'SALE' | 'RENT' | 'MANAGEMENT';
    dealValue: number;
    percentage: number;
    amount: number;
    status: 'UNPAID' | 'PAID';
    expenseId?: string; // Link to the payout expense
    createdAt: number;
    paidAt?: number;
}

export interface Mission {
    id: string;
    no: string;
    title: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    ownerId?: string | null;
    leadId?: string | null;
    status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
    resultSummary: string;
    createdAt: number;
    updatedAt?: number;
}

export interface BudgetItem {
    id: string;
    category: string;
    type: 'INCOME' | 'EXPENSE';
    monthlyAmounts: number[]; // 12 months
}

export interface Budget {
    id: string;
    year: number;
    items: BudgetItem[];
    createdAt: number;
    updatedAt?: number;
}

export interface AuditIssue {
    id: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    title: string;
    description: string;
    entityType?: keyof Omit<Database, 'settings' | 'auth'>;
    entityId?: string;
    entityIdentifier?: string;
    resolutionPath?: string;
}

export interface DerivedData {
    kpis: {
        totalProperties: number;
        occupancyRate: number;
        vacantUnits: number;
        totalCollected: number;
        totalArrears: number;
        depositsHeld: number;
        netProfit: number;
        officeExpenses: number;
    };
    contracts: {
        [id: string]: {
            expected: number;
            paid: number;
            balance: number;
            depositBalance: number;
        };
    };
    owners: {
        // ... to be defined if needed
    };
    hardGateIssues: string[];
}


export interface Database {
  settings: Settings;
  auth: {
    users: User[];
  };
  owners: Owner[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  contracts: Contract[];
  invoices: Invoice[];
  receipts: Receipt[];
  receiptAllocations: ReceiptAllocation[];
  expenses: Expense[];
  maintenanceRecords: MaintenanceRecord[];
  depositTxs: DepositTx[];
  auditLog: AuditLogEntry[];
  governance: Governance;
  ownerSettlements: OwnerSettlement[];
  serials: Serials;
  snapshots: Snapshot[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  autoBackups: AutoBackup[];
  // Phase 1 Snapshots
  ownerBalances: OwnerBalance[];
  accountBalances: AccountBalance[];
  kpiSnapshots: KpiSnapshot[];
  contractBalances: ContractBalance[];
  tenantBalances: TenantBalance[];
  // New Tables
  notificationTemplates: NotificationTemplate[];
  outgoingNotifications: OutgoingNotification[];
  appNotifications: AppNotification[];
  leads: Lead[];
  lands: Land[];
  commissions: Commission[];
  missions: Mission[];
  budgets: Budget[];
  // FIX: Added attachments table
  attachments: Attachment[];
  // Utilities & Services
  utilityRecords: UtilityRecord[];
}

export type OperationType = 'addReceipt' | 'addExpense' | 'voidReceipt' | 'voidExpense' | 'generateInvoices' | 'addManualJournalVoucher';

export interface PerformanceMetrics {
    addReceipt: number[];
    addExpense: number[];
    voidReceipt: number[];
    voidExpense: number[];
    generateInvoices: number[];
    addManualJournalVoucher: number[];
    gateChecks: number[];
}

// FIX: Refactored AppContextType to align with new service-oriented architecture. Removed direct data manipulation methods and auth functions, exposing services and auth state instead.
export interface AppContextType {
  db: Database | null;
  auth: {
    currentUser: User | null | undefined;
    login: (username: string, password: string) => Promise<{ ok: boolean; msg: string; mustChange?: boolean }>;
    logout: () => void;
    changePassword: (userId: string, newPass: string) => Promise<{ ok: boolean }>;
    addUser: (user: Omit<User, 'id'|'createdAt'|'salt'|'hash'>, pass: string) => Promise<{ok: boolean, msg: string}>;
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;
    forcePasswordReset: (userId: string) => Promise<void>;
  };
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  rebuildSnapshotsFromJournal: () => Promise<{ duration: number }>;
  isReadOnly: boolean;
  canAccess: (action: string) => boolean;
  
  // Data and Financial Services
  dataService: {
    add: <T extends keyof Omit<Database, 'settings' | 'auth' | 'governance' | 'serials' | 'autoBackups' | 'ownerBalances' | 'accountBalances' | 'kpiSnapshots' | 'contractBalances' | 'tenantBalances'>>(table: T, entry: Omit<Database[T][number], 'id' | 'createdAt' | 'no'>) => Promise<Database[T][number] | null>;
    update: <T extends keyof Database | 'users'>(table: T, id: string, updates: Partial<any>) => Promise<void>;
    remove: <T extends keyof Database | 'users'>(table: T, id: string) => Promise<void>;
  };
  financeService: {
    addReceiptWithAllocations: (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'no' | 'status'>, allocations: { invoiceId: string, amount: number }[]) => Promise<void>;
    addManualJournalVoucher: (voucher: { date: string; notes: string; lines: { accountId: string; debit: number; credit: number }[] }) => Promise<void>;
    voidReceipt: (id: string) => Promise<void>;
    voidExpense: (id: string) => Promise<void>;
    generateMonthlyInvoices: () => Promise<number>;
    payoutCommission: (commissionId: string) => Promise<void>;
    // FIX: Add generateLateFees to financeService type
    generateLateFees: () => Promise<number>;
  };
  
  // Backup and System
  createBackup: () => Promise<string>;
  restoreBackup: (data: string) => Promise<void>;
  lockPeriod: (ym: string) => Promise<void>;
  unlockPeriod: (ym: string) => Promise<void>;
  setReadOnly: (readOnly: boolean) => Promise<void>;
  
  // Live Data & Derived State
  isDataStale: boolean;
  performanceMetrics: PerformanceMetrics;
  logOperationTime: (operation: OperationType | 'gateChecks', duration: number) => void;
  ownerBalances: { [ownerId: string]: OwnerBalance };
  contractBalances: { [contractId: string]: ContractBalance };
  tenantBalances: { [tenantId: string]: TenantBalance };

  // Other Utilities
  updateNotificationTemplate: (id: string, updates: Partial<NotificationTemplate>) => Promise<void>;
  generateNotifications: () => Promise<number>;
  generateOwnerPortalLink: (ownerId: string) => Promise<string>;
  createSnapshot: (note: string) => Promise<void>;
  
  // FIX: Add missing properties for People and Settings pages
  sendWhatsApp: (phone: string, message: string) => void;
  runManualAutomation: () => Promise<any>;
}