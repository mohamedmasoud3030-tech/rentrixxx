export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProfileRow = {
  id: string;
  username: string | null;
  role: 'ADMIN' | 'USER' | null;
  must_change_password: boolean | null;
  is_disabled: boolean | null;
  created_at: number | null;
};

type GenericTable = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id'>;
        Update: Partial<ProfileRow>;
        Relationships: never[];
      };
      [key: string]: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, { Args: Record<string, any>; Returns: any }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}
