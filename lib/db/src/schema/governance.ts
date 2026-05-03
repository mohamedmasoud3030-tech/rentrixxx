import { pgTable, integer, boolean, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const governanceTable = pgTable("governance", {
  id: integer("id").primaryKey(),
  readOnly: boolean("read_only").notNull().default(false),
  lockedPeriods: text("locked_periods").array(),
});

export const insertGovernanceSchema = createInsertSchema(governanceTable);
export type InsertGovernance = z.infer<typeof insertGovernanceSchema>;
export type Governance = typeof governanceTable.$inferSelect;
