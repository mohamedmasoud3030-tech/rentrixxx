import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username"),
  role: text("role"),
  mustChangePassword: boolean("must_change_password").default(false),
  isDisabled: boolean("is_disabled").default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
});

export const insertProfileSchema = createInsertSchema(profilesTable);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
