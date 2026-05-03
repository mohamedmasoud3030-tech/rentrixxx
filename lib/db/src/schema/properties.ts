import { pgTable, uuid, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  area: numeric("area"),
  yearBuilt: integer("year_built"),
  facilities: text("facilities"),
  notes: text("notes").default(""),
  isDemo: boolean("is_demo"),
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const insertPropertySchema = createInsertSchema(propertiesTable);
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;
