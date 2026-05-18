import type { Property, Unit } from '@/types/domain';
import type { Maintenance } from './maintenance-service';

export type MaintenancePriorityFilter = Maintenance['priority'] | 'all';
export type MaintenanceStatusFilter = Maintenance['status'] | 'all';

export type MaintenanceFilters = Readonly<{
  status: MaintenanceStatusFilter;
  priority: MaintenancePriorityFilter;
  propertyId: string;
}>;

export type MaintenanceSummary = Readonly<{
  total: number;
  open: number;
  inProgress: number;
  urgent: number;
}>;

type MaintenanceLocationRequest = Pick<Maintenance, 'property_id' | 'unit_id'>;
type MaintenancePropertyLabel = Pick<Property, 'id' | 'title'>;
type MaintenanceUnitLabel = Pick<Unit, 'id' | 'property_id' | 'unit_number'>;

export function buildMaintenanceLocationLabel(
  request: MaintenanceLocationRequest,
  properties: MaintenancePropertyLabel[],
  units: MaintenanceUnitLabel[],
): string {
  const property = properties.find((item) => item.id === request.property_id);
  const unit = request.unit_id ? units.find((item) => item.id === request.unit_id && item.property_id === request.property_id) : null;
  const propertyLabel = property?.title.trim() || 'عقار غير محدد';
  const unitLabel = request.unit_id ? unit?.unit_number.trim() || 'وحدة غير محددة' : 'بدون وحدة';

  return `${propertyLabel} / ${unitLabel}`;
}

export function filterMaintenanceRequests(rows: Maintenance[], filters: MaintenanceFilters): Maintenance[] {
  return rows.filter((row) => {
    const statusMatches = filters.status === 'all' || row.status === filters.status;
    const priorityMatches = filters.priority === 'all' || row.priority === filters.priority;
    const propertyMatches = !filters.propertyId || row.property_id === filters.propertyId;

    return statusMatches && priorityMatches && propertyMatches;
  });
}

export function summarizeMaintenanceRequests(rows: Maintenance[]): MaintenanceSummary {
  return rows.reduce<MaintenanceSummary>(
    (summary, row) => ({
      total: summary.total + 1,
      open: summary.open + (row.status === 'open' ? 1 : 0),
      inProgress: summary.inProgress + (row.status === 'in_progress' ? 1 : 0),
      urgent: summary.urgent + (row.priority === 'urgent' ? 1 : 0),
    }),
    { total: 0, open: 0, inProgress: 0, urgent: 0 },
  );
}
