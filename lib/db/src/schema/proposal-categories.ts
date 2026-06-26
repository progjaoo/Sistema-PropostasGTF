import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proposalCategoriesTable = pgTable("proposal_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProposalCategorySchema = createInsertSchema(proposalCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProposalCategory = z.infer<typeof insertProposalCategorySchema>;
export type ProposalCategory = typeof proposalCategoriesTable.$inferSelect;
