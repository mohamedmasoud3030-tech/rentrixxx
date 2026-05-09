import { pgTable, uuid, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const unitsTable = pgTable("units", {
  id: uuid("id").primaryKey(),
  propertyId: uuid("property_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  floor: text("floor"),
  status: text("status").notNull(),
  rentDefault: numeric("rent_default").notNull().default("0"),
  minRent: numeric("min_rent"),
  area: numeric("area"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  kitchens: integer("kitchens"),
  livingRooms: integer("living_rooms"),
  waterMeter: text("water_meter"),
  electricityMeter: text("electricity_meter"),
  features: text("features"),
  notes: text("notes").default(""),
  isDemo: boolean("is_demo"),
  organizationId: uuid("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
});

export const insertUnitSchema = createInsertSchema(unitsTable);
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Unit = typeof unitsTable.$inferSelect;
