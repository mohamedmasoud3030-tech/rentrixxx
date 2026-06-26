import type { Database } from '@/types/database';

export type CommunicationRecord = Database['public']['Tables']['communication_records']['Row'];

export type CommunicationFormValues = Readonly<{
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  channel: string;
  direction: string;
  status: string;
  subject: string;
  body: string;
  related_entity_type: string;
  related_entity_id: string;
}>;

export type CommunicationFilters = Readonly<{
  query: string;
  channel: string;
  status: string;
}>;
