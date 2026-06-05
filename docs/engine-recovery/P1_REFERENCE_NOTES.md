# P1 Maintenance Engine Reference Notes

## Scope

The uploaded ERP reference package includes maintenance and asset-maintenance ideas that may inform native Rentrix property-operations design after P0 financial stabilization.

## Maintenance scheduling and visits

Primary references:

```text
maintenance/doctype/maintenance_schedule/maintenance_schedule.py
maintenance/doctype/maintenance_schedule/maintenance_schedule.json
maintenance/doctype/maintenance_visit/maintenance_visit.py
maintenance/doctype/maintenance_visit/maintenance_visit.json
```

Useful concepts for Rentrix review:

1. A maintenance schedule belongs to a property and optionally to a unit or tracked equipment item.
2. A schedule produces planned visits or actionable maintenance records.
3. A visit uses an explicit lifecycle such as planned, assigned, in progress, completed, or cancelled.
4. Completion evidence may record performed work, notes, completion date, and responsible user or technician when supported.
5. Maintenance history should remain visible from property and unit workspaces.
6. Scheduling and visits must not require inventory or asset-depreciation support.

## Asset maintenance and repair

Primary references:

```text
assets/doctype/asset_maintenance/asset_maintenance.py
assets/doctype/asset_maintenance_log/asset_maintenance_log.py
assets/doctype/asset_repair/asset_repair.py
```

Potentially useful concepts:

- recurring preventive maintenance;
- maintenance logs;
- repair status tracking;
- consumed-material notes as plain operational data only;
- repair costs linked to supported property expenses when explicitly approved.

## Deferred concepts

Asset capitalization, depreciation schedules, disposal accounting, GL composers, purchase-invoice coupling, and inventory valuation remain outside current Rentrix scope.
