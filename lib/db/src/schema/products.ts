import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stationsTable } from "./stations";

export const productColorEnum = pgEnum("product_color", ["BLUE", "YELLOW", "RED", "GREEN", "DARK"]);

export const productTemplatesTable = pgTable("product_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stationId: text("station_id").notNull().references(() => stationsTable.id),
  name: text("name").notNull(),
  qty: text("qty").notNull().default("01"),
  title: text("title").notNull(),
  description: text("description"),
  detail: text("detail"),
  program: text("program"),
  tags: text("tags").array().notNull().default([]),
  color: productColorEnum("color").notNull().default("BLUE"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductTemplateSchema = createInsertSchema(productTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductTemplate = z.infer<typeof insertProductTemplateSchema>;
export type ProductTemplate = typeof productTemplatesTable.$inferSelect;
