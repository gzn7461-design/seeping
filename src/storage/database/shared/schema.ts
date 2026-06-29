import { pgTable, serial, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const commentTemplates = pgTable(
  "comment_templates",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 50 }).notNull().default("general"),
    tags: text("tags"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comment_templates_category_idx").on(table.category),
    index("comment_templates_created_at_idx").on(table.created_at),
  ]
);

export const publishTasks = pgTable(
  "publish_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    template_id: varchar("template_id", { length: 36 }).references(() => commentTemplates.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    target_url: text("target_url").notNull(),
    target_platform: varchar("target_platform", { length: 50 }).notNull().default("generic"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    scheduled_at: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    published_at: timestamp("published_at", { withTimezone: true }),
    error_message: text("error_message"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("publish_tasks_template_id_idx").on(table.template_id),
    index("publish_tasks_status_idx").on(table.status),
    index("publish_tasks_scheduled_at_idx").on(table.scheduled_at),
    index("publish_tasks_status_scheduled_idx").on(table.status, table.scheduled_at),
  ]
);
