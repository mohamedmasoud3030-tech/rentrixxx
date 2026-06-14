# v0.2 Item 4 — Money Formatting, Currency Context, and CSV Output

**Date:** 2026-06-09  
**Roadmap:** v0.2 Item 4 — Normalize money formatting, currency context, and CSV output across visible commercial screens  
**Status:** PASS — all money values use canonical formatter

---

## Money formatting — ✅ UNIFIED

All money values in the application flow through a single canonical path:

```
formatMoney (lib/formatters.ts)
  ↓
Intl.NumberFormat with:
  - style: 'currency'
  - currencyDisplay: 'code' (OMR, AED, SAR, etc.)
  - locale-specific formatting (ar-OM, en-OM, etc.)
  - minorUnit: 2–3 decimals (currency-dependent)
```

### Concrete examples
| Locale | Amount | Output |
|--------|--------|--------|
| ar-OM (default) | 1234.567 | `‏١٬٢٣٤٫٥٦٧ OMR‏` |
| en-OM | 1234.567 | `1,234.567 OMR` |
| ar-OM | 1234.50 | `‏١٬٢٣٤٫٥٠٠ OMR‏` |

### Where used
- Dashboard KPI cards: `formatDefaultCompanyMoney`
- Properties table: `formatCompanyMoney(defaultCompanyLocalSettings, ...)`
- Units list: `formatCompanyMoney(defaultCompanyLocalSettings, ...)`
- Contracts table: `formatDefaultCompanyMoney`
- Invoices: `formatMoney` via `financials-formatters.ts`
- Receipts: `formatMoney` via `receipt-formatters.ts`
- Expenses: `formatCompanyMoney(defaultCompanyLocalSettings, ...)`
- Settings preview: `formatCompanyMoney(previewSettings, ...)`
- CSV exports: `formatDefaultCompanyMoney`

**Result:** ✅ 100% consistency — no custom `toFixed()`, no locale-unaware formatting, no divergent currency displays.

---

## Currency context — ✅ CORRECT

### Application default
- Currency: **OMR** (Omani Rial)
- Minor unit: **3 decimals**
- Locale: **ar-OM**
- Timezone: **Asia/Muscat**

### Settings flexibility
`companySettings.ts` allows customization:
- 8 supported currencies (OMR, AED, SAR, QAR, KWD, BHD, USD, EGP)
- 8 supported locales (ar-OM, en-OM, ar, en, etc.)
- Minor units vary by currency (2–3 decimals)

### Static metadata
Each currency has documented metadata:
```typescript
OMR: { code: 'OMR', label: 'Omani Rial', minorUnit: 3 }
AED: { code: 'AED', label: 'UAE Dirham', minorUnit: 2 }
...
```

**Result:** ✅ Currency context is explicit and configurable.

---

## CSV export — ✅ CONSISTENT

### Current exports
- **Contracts export** (`contractListExport.ts`):
  - Uses `formatDefaultCompanyMoney` for all amounts
  - Decimal precision: 3 places (OMR default)
  - Currency code included in formatted value

- **Other exports** (properties, units, invoices):
  - Use same `formatDefaultCompanyMoney` or `formatCompanyMoney`
  - Consistent decimal places and currency display

### CSV row examples
```
العقد,الوحدة,المستأجر,قيمة الإيجار الشهري,التاريخ
#12345,1,Ahmed Ali,‏١٬٢٠٠٫٠٠٠ OMR,2026-06-01
#12346,2,Fatima Hassan,‏١٬٥٠٠٫٠٠٠ OMR,2026-06-05
```

**Result:** ✅ CSV exports are formatted consistently with UI display.

---

## Known implementation notes

### Decimal precision
- OMR (Oman): 3 decimals (millesimal unit = baisa)
- AED, SAR, QAR, USD, EGP: 2 decimals
- KWD, BHD: 3 decimals
- Correctly applied via `minorUnit` in `currencyMetadata`

### RTL number handling
Arabic numerals (ar locale) are rendered correctly:
- Digits: ٠١٢٣٤٥٦٧٨٩
- Separators: ٫ (Arabic decimal), ، (Arabic thousand)
- Direction: managed by `Intl.NumberFormat` + `dir="rtl"` on container

### Money normalization
`moneyNormalization.ts` ensures safe number handling:
- Rounds to appropriate decimal places
- Handles null/undefined → 0
- Prevents floating-point artifacts

---

## Deferred items (not in scope for this audit)

These are acceptable for beta and deferred to later releases:

1. **Custom currency symbol display** — currently uses 'code' (OMR); symbol mode available in formatters but not used
2. **Thousand/decimal separator customization** — uses Intl defaults per locale
3. **Negative number styling** — rendered per Intl defaults (no special formatting)
4. **Accounting format (parentheses)** — not used; standard notation only

---

## Conclusion

**Status:** ✅ PASS  
Money formatting is unified, consistent, and properly contextualized.

The application correctly:
1. Routes all money values through a single formatter
2. Respects currency metadata (decimal places)
3. Applies locale-specific formatting (Arabic/English)
4. Handles RTL number rendering
5. Exports CSV with consistent formatting
6. Supports currency/locale customization

No changes required for v0.2 Item 4.
