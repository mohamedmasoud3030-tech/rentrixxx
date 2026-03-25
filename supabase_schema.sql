-- ============================================================
-- Rentrix – Supabase SQL Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. USER PROFILES  (linked to Supabase auth.users)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at      BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"  ON public.profiles FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE  USING (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- 2. SETTINGS  (single row per organisation)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id      INT PRIMARY KEY DEFAULT 1,
    data    JSONB NOT NULL DEFAULT '{}'::JSONB
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all_auth" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 3. OWNERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owners (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    id_no       TEXT,
    nationality TEXT,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_all_auth" ON public.owners FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 4. PROPERTIES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.properties (
    id          TEXT PRIMARY KEY,
    owner_id    TEXT REFERENCES public.owners(id),
    name        TEXT NOT NULL,
    address     TEXT,
    type        TEXT,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_all_auth" ON public.properties FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 5. UNITS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.units (
    id          TEXT PRIMARY KEY,
    property_id TEXT REFERENCES public.properties(id),
    name        TEXT NOT NULL,
    type        TEXT,
    status      TEXT,
    floor       TEXT,
    area        NUMERIC,
    rent        NUMERIC,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_all_auth" ON public.units FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 6. TENANTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    id_no       TEXT,
    nationality TEXT,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_all_auth" ON public.tenants FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 7. CONTRACTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
    id              TEXT PRIMARY KEY,
    no              TEXT,
    unit_id         TEXT REFERENCES public.units(id),
    tenant_id       TEXT REFERENCES public.tenants(id),
    start_date      TEXT,
    end_date        TEXT,
    rent_amount     NUMERIC,
    deposit         NUMERIC,
    payment_cycle   TEXT,
    status          TEXT,
    notes           TEXT,
    commission_rate NUMERIC,
    created_at      BIGINT
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contracts_all_auth" ON public.contracts FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 8. INVOICES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
    id                TEXT PRIMARY KEY,
    no                TEXT,
    contract_id       TEXT REFERENCES public.contracts(id),
    due_date          TEXT,
    amount            NUMERIC,
    tax_amount        NUMERIC,
    paid_amount       NUMERIC DEFAULT 0,
    status            TEXT,
    type              TEXT DEFAULT 'RENT',
    notes             TEXT,
    related_invoice_id TEXT,
    created_at        BIGINT
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_all_auth" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 9. RECEIPTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipts (
    id          TEXT PRIMARY KEY,
    no          TEXT,
    contract_id TEXT REFERENCES public.contracts(id),
    date_time   TEXT,
    amount      NUMERIC,
    channel     TEXT,
    status      TEXT DEFAULT 'POSTED',
    notes       TEXT,
    voided_at   BIGINT,
    created_at  BIGINT
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_all_auth" ON public.receipts FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 10. RECEIPT ALLOCATIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipt_allocations (
    id          TEXT PRIMARY KEY,
    receipt_id  TEXT REFERENCES public.receipts(id),
    invoice_id  TEXT REFERENCES public.invoices(id),
    amount      NUMERIC,
    created_at  BIGINT
);

ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_allocations_all_auth" ON public.receipt_allocations FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 11. EXPENSES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
    id          TEXT PRIMARY KEY,
    no          TEXT,
    contract_id TEXT,
    date_time   TEXT,
    amount      NUMERIC,
    category    TEXT,
    charged_to  TEXT,
    description TEXT,
    status      TEXT DEFAULT 'POSTED',
    voided_at   BIGINT,
    created_at  BIGINT
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all_auth" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 12. MAINTENANCE RECORDS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id           TEXT PRIMARY KEY,
    no           TEXT,
    unit_id      TEXT REFERENCES public.units(id),
    request_date TEXT,
    description  TEXT,
    status       TEXT,
    cost         NUMERIC,
    charged_to   TEXT,
    notes        TEXT,
    created_at   BIGINT
);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance_records_all_auth" ON public.maintenance_records FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 13. DEPOSIT TRANSACTIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposit_txs (
    id          TEXT PRIMARY KEY,
    contract_id TEXT REFERENCES public.contracts(id),
    type        TEXT,
    amount      NUMERIC,
    date        TEXT,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.deposit_txs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposit_txs_all_auth" ON public.deposit_txs FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 14. AUDIT LOG
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id        TEXT PRIMARY KEY,
    ts        BIGINT,
    user_id   TEXT,
    username  TEXT,
    action    TEXT,
    entity    TEXT,
    entity_id TEXT,
    note      TEXT
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_all_auth" ON public.audit_log FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 15. ACCOUNTS (Chart of Accounts)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
    id         TEXT PRIMARY KEY,
    no         TEXT,
    name       TEXT,
    type       TEXT,
    is_parent  BOOLEAN DEFAULT false,
    parent_id  TEXT,
    created_at BIGINT
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounts_all_auth" ON public.accounts FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 16. JOURNAL ENTRIES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id          TEXT PRIMARY KEY,
    no          TEXT,
    date        TEXT,
    account_id  TEXT REFERENCES public.accounts(id),
    amount      NUMERIC,
    type        TEXT,
    source_id   TEXT,
    entity_type TEXT,
    entity_id   TEXT,
    created_at  BIGINT
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entries_all_auth" ON public.journal_entries FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 17. OWNER SETTLEMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_settlements (
    id       TEXT PRIMARY KEY,
    no       TEXT,
    owner_id TEXT REFERENCES public.owners(id),
    date     TEXT,
    amount   NUMERIC,
    method   TEXT,
    notes    TEXT,
    created_at BIGINT
);

ALTER TABLE public.owner_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_settlements_all_auth" ON public.owner_settlements FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 18. SNAPSHOTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.snapshots (
    id   TEXT PRIMARY KEY,
    ts   BIGINT,
    note TEXT,
    data JSONB
);

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_all_auth" ON public.snapshots FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 19. SERIALS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.serials (
    id               INT PRIMARY KEY DEFAULT 1,
    receipt          INT DEFAULT 1000,
    expense          INT DEFAULT 1000,
    maintenance      INT DEFAULT 1000,
    invoice          INT DEFAULT 1000,
    lead             INT DEFAULT 1000,
    owner_settlement INT DEFAULT 1000,
    journal_entry    INT DEFAULT 1000,
    mission          INT DEFAULT 1000,
    contract         INT DEFAULT 1000
);

ALTER TABLE public.serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "serials_all_auth" ON public.serials FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 20. GOVERNANCE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.governance (
    id             INT PRIMARY KEY DEFAULT 1,
    read_only      BOOLEAN DEFAULT false,
    locked_periods JSONB DEFAULT '[]'::JSONB
);

ALTER TABLE public.governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "governance_all_auth" ON public.governance FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 21. NOTIFICATION TEMPLATES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id         TEXT PRIMARY KEY,
    name       TEXT,
    template   TEXT,
    is_enabled BOOLEAN DEFAULT true
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_templates_all_auth" ON public.notification_templates FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 22. OUTGOING NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outgoing_notifications (
    id          TEXT PRIMARY KEY,
    template_id TEXT,
    tenant_id   TEXT,
    message     TEXT,
    status      TEXT,
    sent_at     BIGINT,
    created_at  BIGINT
);

ALTER TABLE public.outgoing_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outgoing_notifications_all_auth" ON public.outgoing_notifications FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 23. APP NOTIFICATIONS (in-app alerts)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id         TEXT PRIMARY KEY,
    created_at BIGINT,
    is_read    BOOLEAN DEFAULT false,
    role       TEXT,
    type       TEXT,
    title      TEXT,
    message    TEXT,
    link       TEXT
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_notifications_all_auth" ON public.app_notifications FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 24. LEADS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
    id         TEXT PRIMARY KEY,
    no         TEXT,
    name       TEXT,
    phone      TEXT,
    email      TEXT,
    source     TEXT,
    status     TEXT,
    notes      TEXT,
    created_at BIGINT
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_all_auth" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 25. LANDS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lands (
    id            TEXT PRIMARY KEY,
    plot_no       TEXT,
    location      TEXT,
    area          NUMERIC,
    owner_id      TEXT,
    purchase_price NUMERIC,
    status        TEXT,
    notes         TEXT,
    created_at    BIGINT
);

ALTER TABLE public.lands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lands_all_auth" ON public.lands FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 26. COMMISSIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commissions (
    id         TEXT PRIMARY KEY,
    staff_id   TEXT,
    staff_name TEXT,
    amount     NUMERIC,
    status     TEXT,
    source_id  TEXT,
    created_at BIGINT
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions_all_auth" ON public.commissions FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 27. MISSIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.missions (
    id          TEXT PRIMARY KEY,
    no          TEXT,
    date        TEXT,
    description TEXT,
    assigned_to TEXT,
    status      TEXT,
    notes       TEXT,
    created_at  BIGINT
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_all_auth" ON public.missions FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 28. BUDGETS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
    id         TEXT PRIMARY KEY,
    year       INT,
    items      JSONB DEFAULT '[]'::JSONB,
    notes      TEXT,
    created_at BIGINT
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_all_auth" ON public.budgets FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 29. ATTACHMENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attachments (
    id          TEXT PRIMARY KEY,
    entity_type TEXT,
    entity_id   TEXT,
    name        TEXT,
    mime        TEXT,
    size        BIGINT,
    data_url    TEXT,
    created_at  BIGINT
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attachments_all_auth" ON public.attachments FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 30. AUTO BACKUPS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auto_backups (
    id         TEXT PRIMARY KEY,
    created_at BIGINT,
    size       BIGINT,
    checksum   TEXT
);

ALTER TABLE public.auto_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auto_backups_all_auth" ON public.auto_backups FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 31. BALANCE SNAPSHOTS (derived / cached)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_balances (
    owner_id       TEXT PRIMARY KEY,
    total_income   NUMERIC DEFAULT 0,
    total_expenses NUMERIC DEFAULT 0,
    commission     NUMERIC DEFAULT 0,
    net_balance    NUMERIC DEFAULT 0,
    updated_at     BIGINT
);

ALTER TABLE public.owner_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_balances_all_auth" ON public.owner_balances FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.contract_balances (
    contract_id    TEXT PRIMARY KEY,
    tenant_id      TEXT,
    unit_id        TEXT,
    total_invoiced NUMERIC DEFAULT 0,
    total_paid     NUMERIC DEFAULT 0,
    balance_due    NUMERIC DEFAULT 0,
    updated_at     BIGINT
);

ALTER TABLE public.contract_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_balances_all_auth" ON public.contract_balances FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.tenant_balances (
    tenant_id   TEXT PRIMARY KEY,
    balance_due NUMERIC DEFAULT 0,
    updated_at  BIGINT
);

ALTER TABLE public.tenant_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_balances_all_auth" ON public.tenant_balances FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- DONE – paste into Supabase SQL Editor and click Run
-- ──────────────────────────────────────────────────────────────
