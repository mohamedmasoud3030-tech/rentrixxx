import { pgTable, uuid, text, numeric, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey(),
  no: text("no").notNull(),
  contractId: uuid("contract_id"),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount").notNull(),
  taxAmount: numeric("tax_amount"),
  paidAmount: numeric("paid_amount").notNull().default("0"),
  status: text("status").notNull(),
  type: text("type").notNull(),
  notes: text("notes").default(""),
  relatedInvoiceId: uuid("related_invoice_id"),
  paymentMethod: text("payment_method"),
  externalPaymentRef: text("external_payment_ref"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable);
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
