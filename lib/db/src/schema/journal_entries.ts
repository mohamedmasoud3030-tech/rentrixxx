import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const journalEntriesTable = pgTable("journal_entries", {
  id: uuid("id").primaryKey(),
  no: text("no"),
  date: date("date"),
  accountId: uuid("account_id"),
  amount: numeric("amount").notNull(),
  type: text("type").notNull(),
  sourceId: text("source_id"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable);
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
