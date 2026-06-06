# Rentrix Domain Rules

These invariants protect data integrity. Agents must preserve them across UI, services, database migrations, RLS policies, imports, exports, and tests.

## Property chain

```text
Property → Unit → Contract → Invoice → Payment → Receipt
             └──────── Tenant
Property → Expense
Property → Maintenance Record
Owner → Property or Owner Agreement
```

## Contract rules

- A contract references exactly one unit and one tenant.
- A unit cannot have overlapping active contracts.
- A unit must belong to a property before it can be contracted.
- Contract state transitions must remain explicit and auditable.

## Payment and receipt rules

- A payment belongs to exactly one contract.
- Standalone payments are not allowed.
- A receipt is generated only from a posted payment.
- Posted payments are immutable.
- A correction uses reversal and replacement; it does not silently edit history.
- Allocation behavior must be deterministic and covered by business-rule tests.

## Balance rules

- Outstanding balance is derived, not manually edited.
- Use one canonical calculation path for balances and arrears.
- UI totals, reports, exports, and service responses must use the same definition.
- Do not introduce a second stored balance field as an alternative source of truth.

## Referential integrity

- No orphan units without properties.
- No orphan contracts without units and tenants.
- No orphan payments without contracts.
- No property expenses without properties.
- Destructive actions must be blocked or explicitly handled when dependent records exist.

## Release requirement

Any change touching contracts, invoices, payments, receipts, arrears, expenses, migrations, or RLS must include targeted tests for the affected invariant.