import { pgTable, uuid, text, numeric, integer, boolean, bigint, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contractsTable = pgTable("contracts", {
  id: uuid("id").primaryKey(),
  no: text("no"),
  unitId: uuid("unit_id"),
  tenantId: uuid("tenant_id"),
  rentAmount: numeric("rent_amount").notNull(),
  dueDay: integer("due_day").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  deposit: numeric("deposit").notNull().default("0"),
  status: text("status").notNull(),
  sponsorName: text("sponsor_name"),
  sponsorId: text("sponsor_id"),
  sponsorPhone: text("sponsor_phone"),
  isDemo: boolean("is_demo"),
  organizationId: uuid("organization_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
});

export const insertContractSchema = createInsertSchema(contractsTable);
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
