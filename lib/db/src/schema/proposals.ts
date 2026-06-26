import { pgTable, text, boolean, timestamp, integer, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stationsTable } from "./stations";
import { advertisersTable } from "./advertisers";
import { usersTable } from "./users";
import { proposalTemplatesTable } from "./proposal-templates";
import { productColorEnum } from "./products";

export const proposalStatusEnum = pgEnum("proposal_status", ["DRAFT", "SENT", "APPROVED", "REJECTED", "ARCHIVED"]);

export const proposalsTable = pgTable("proposals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  stationId: text("station_id").notNull().references(() => stationsTable.id),
  advertiserId: text("advertiser_id").references(() => advertisersTable.id),
  createdById: text("created_by_id").notNull().references(() => usersTable.id),
  status: proposalStatusEnum("status").notNull().default("DRAFT"),
  fromTemplateId: text("from_template_id").references(() => proposalTemplatesTable.id),
  propType: text("prop_type").notNull().default("Proposta Comercial"),
  propMonth: text("prop_month").notNull(),
  propYear: text("prop_year").notNull(),
  campTag: text("camp_tag"),
  clientLine1: text("client_line1"),
  clientLine2: text("client_line2"),
  dateStart: text("date_start"),
  dateEnd: text("date_end"),
  periodDesc: text("period_desc"),
  bannerBase64: text("banner_base64"),
  overlayOpacity: integer("overlay_opacity").notNull().default(70),
  stats: json("stats").notNull().default([]),
  investDesc: text("invest_desc"),
  investValue: text("invest_value"),
  contactName: text("contact_name"),
  contactRole: text("contact_role"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const proposalProductsTable = pgTable("proposal_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proposalId: text("proposal_id").notNull().references(() => proposalsTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  qty: text("qty").notNull().default("01"),
  title: text("title").notNull(),
  description: text("description"),
  detail: text("detail"),
  program: text("program"),
  tags: text("tags").array().notNull().default([]),
  color: productColorEnum("color").notNull().default("BLUE"),
});

export const proposalVersionsTable = pgTable("proposal_versions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  proposalId: text("proposal_id").notNull().references(() => proposalsTable.id, { onDelete: "cascade" }),
  snapshot: json("snapshot").notNull(),
  createdById: text("created_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposalsTable.$inferSelect;
export type ProposalProduct = typeof proposalProductsTable.$inferSelect;
export type ProposalVersion = typeof proposalVersionsTable.$inferSelect;
