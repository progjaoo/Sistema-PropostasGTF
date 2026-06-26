import { pgTable, text, boolean, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stationsTable } from "./stations";
import { proposalCategoriesTable } from "./proposal-categories";
import { productColorEnum } from "./products";

export const proposalTemplatesTable = pgTable("proposal_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stationId: text("station_id").notNull().references(() => stationsTable.id),
  categoryId: text("category_id").notNull().references(() => proposalCategoriesTable.id),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  propType: text("prop_type").notNull().default("Proposta Comercial"),
  campTag: text("camp_tag"),
  periodDesc: text("period_desc"),
  investDesc: text("invest_desc"),
  stats: json("stats").notNull().default([]),
  overlayOpacity: integer("overlay_opacity").notNull().default(70),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const proposalTemplateProductsTable = pgTable("proposal_template_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: text("template_id").notNull().references(() => proposalTemplatesTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  qty: text("qty").notNull().default("01"),
  title: text("title").notNull(),
  description: text("description"),
  detail: text("detail"),
  program: text("program"),
  tags: text("tags").array().notNull().default([]),
  color: productColorEnum("color").notNull().default("BLUE"),
});

export const insertProposalTemplateSchema = createInsertSchema(proposalTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposalTemplate = z.infer<typeof insertProposalTemplateSchema>;
export type ProposalTemplate = typeof proposalTemplatesTable.$inferSelect;
export type ProposalTemplateProduct = typeof proposalTemplateProductsTable.$inferSelect;
