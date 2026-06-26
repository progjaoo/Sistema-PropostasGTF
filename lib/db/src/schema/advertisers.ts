import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const advertisersTable = pgTable("advertisers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tradeName: text("trade_name").notNull(),
  legalName: text("legal_name"),
  cnpj: text("cnpj").unique(),
  logoBase64: text("logo_base64"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  segment: text("segment"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdvertiserSchema = createInsertSchema(advertisersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdvertiser = z.infer<typeof insertAdvertiserSchema>;
export type Advertiser = typeof advertisersTable.$inferSelect;
