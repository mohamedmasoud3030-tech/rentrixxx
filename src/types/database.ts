// src/types/database.ts

export interface Owner {
  id: string;
}

export interface Contract {
  id: string;
  startDate: string; // start_date in DB
  endDate: string; // end_date in DB
  rentAmount: number; // rent_amount in DB
}

export interface Profile {
  id: string;
  username: string;
  role: string;
  mustChangePassword: boolean; // must_change_password in DB
  isDisabled: boolean; // is_disabled in DB
  createdAt: string; // created_at in DB
}

export interface Settings {
  data: Record<string, unknown>;
}

export interface Serial {
  id: number;
  receipt: string;
  expense: string;
  maintenance: string;
}

// Root Application-Wide Snapshot of Tables
export interface DatabaseSnapshot {
  owners: Owner[];
  contracts: Contract[];
  profiles: Profile[];
  settings: Settings;
  serials: Serial;
}