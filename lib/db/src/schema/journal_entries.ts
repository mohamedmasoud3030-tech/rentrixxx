import { pgTable, uuid, text, numeric, bigint, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  createdAt: bigint("created_at", { mode: "number" }),
  updatedAt: bigint("updated_at", { mode: "number" }),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable);
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
