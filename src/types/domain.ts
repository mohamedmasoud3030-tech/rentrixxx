export type EntityId = string;

export interface BaseEntity {
  id: EntityId;
  createdAt?: number;
  updatedAt?: number | null;
}

export interface MoneyBalance {
  debit: number;
  credit: number;
  net: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
