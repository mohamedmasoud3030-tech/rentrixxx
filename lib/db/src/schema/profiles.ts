import { pgTable, uuid, text, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  username: text("username"),
  role: text("role"),
  mustChangePassword: boolean("must_change_password").default(false),
  isDisabled: boolean("is_disabled").default(false),
  createdAt: bigint("created_at", { mode: "number" }),
});

export const insertProfileSchema = createInsertSchema(profilesTable);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
