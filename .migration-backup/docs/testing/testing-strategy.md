# Testing Strategy (Baseline v1)

## 1) Baseline Scope

نطاق baseline الأولي للتغطية والاختبارات:

- `src/services/` (خدمات حرجة: finance, auth, security/session, automation)
- `src/hooks/specialized/`
- `src/contexts/`

## 2) Initial Coverage Matrix

| Layer | Priority | Areas | Examples |
|---|---|---|---|
| Unit | High | Finance services | VAT, allocations, arrears, balances |
| Unit | High | Auth services | role resolution, capability checks, profile mapping |
| Unit | High | Security/session | expiry checks, refresh fallback, invalid session handling |
| Unit | High | Automation | task config, scheduler dispatch, daily/manual run guards |
| Integration | High | Payment posting flow | payment distribution + financial consistency checks |
| Integration | High | Invoice creation flow | auth/permission + finance logic assertions |
| Integration | High | Contract renewal flow | contract lifecycle update (`ContractEngine.end`) |
| Integration | High | Automation execution flow | scheduler invocation + result contract |

## 3) Coverage Thresholds (Initial Gate)

- **Lines >= 60%**
- **Branches >= 45%**
- **Functions >= 60%**

هذه القيم مطبقة في `vitest.config.ts` كـ gate إلزامي.

## 4) CI Enforcement Rules

داخل GitHub Actions:

1. `npm run test:coverage` يجب أن ينجح (ويفشل عند كسر thresholds).
2. `npm run test:smoke` يجب أن ينجح على كل PR.
3. أي فشل في خطوتي coverage/smoke يوقف الـ pipeline.

## 5) Smoke Suite (PR Fast Path)

هدف smoke suite: أقل من 3 دقائق، ويغطي الإشارات الحرجة التالية بسرعة:

- UI boot sanity (`src/ui/__tests__/smoke.test.ts`)
- Core integration sanity (`src/services/coreFlows.integration.test.ts`)

الأمر:

```bash
npm run test:smoke
```

## 6) Expansion Plan

- رفع thresholds تدريجيًا كل Sprint (مثال: +5% Lines/Functions حتى الوصول 75%+).
- إضافة integration flows إضافية (invoice posting reconciliation, lease lifecycle end-to-end).
- إدخال nightly full-suite (coverage + heavy integrations) مع تقارير trend.
