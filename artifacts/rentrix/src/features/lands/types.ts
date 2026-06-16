import type { Database } from '@/types/database';

export type LandRecord = Database['public']['Tables']['lands']['Row'];

export type LandFormValues = Readonly<{
  plot_no: string;
  name: string;
  location: string;
  area: string;
  owner_id: string;
  purchase_price: string;
  owner_price: string;
  commission: string;
  category: string;
  status: string;
  notes: string;
}>;

export type LandFilters = Readonly<{
  query: string;
  status: string;
}>;
