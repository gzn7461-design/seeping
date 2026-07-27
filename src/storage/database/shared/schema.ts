import { pgTable, serial, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
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
    stock_code: varchar("stock_code", { length: 20 }),
    stock_name: varchar("stock_name", { length: 50 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comment_templates_category_idx").on(table.category),
    index("comment_templates_created_at_idx").on(table.created_at),
    index("comment_templates_stock_code_idx").on(table.stock_code),
  ]
);

export const publishTasks = pgTable(
  "publish_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    template_id: varchar("template_id", { length: 36 }).references(() => commentTemplates.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    target_url: text("target_url").notNull(),
    target_platform: varchar("target_platform", { length: 50 }).notNull().default("eastmoney"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    stock_code: varchar("stock_code", { length: 20 }),
    stock_name: varchar("stock_name", { length: 50 }),
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
    index("publish_tasks_stock_code_idx").on(table.stock_code),
  ]
);

// 股吧评论采集表
export const stockComments = pgTable(
  "stock_comments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    stock_code: varchar("stock_code", { length: 20 }).notNull(),
    stock_name: varchar("stock_name", { length: 50 }).notNull(),
    username: varchar("username", { length: 100 }).notNull(),
    comment_content: text("comment_content").notNull(),
    comment_time: timestamp("comment_time", { withTimezone: true }).notNull(),
    source_url: text("source_url"),
    // AI 分析结果
    sentiment: varchar("sentiment", { length: 20 }).notNull().default("neutral"), // positive, neutral, negative
    sentiment_score: varchar("sentiment_score", { length: 10 }), // -1.0 到 1.0
    ai_analysis: text("ai_analysis"), // AI 分析详情
    // 扩展字段
    read_count: integer("read_count").default(0), // 阅读数
    reply_count: integer("reply_count").default(0), // 评论数
    title: text("title"), // 标题
    // 元数据
    collected_at: timestamp("collected_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("stock_comments_stock_code_idx").on(table.stock_code),
    index("stock_comments_sentiment_idx").on(table.sentiment),
    index("stock_comments_comment_time_idx").on(table.comment_time),
    index("stock_comments_collected_at_idx").on(table.collected_at),
  ]
);

// 预警配置表
export const alertConfigs = pgTable(
  "alert_configs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    stock_code: varchar("stock_code", { length: 20 }).notNull(),
    stock_name: varchar("stock_name", { length: 50 }).notNull(),
    // 预警阈值
    negative_threshold: varchar("negative_threshold", { length: 10 }).notNull().default("30"), // 差评占比阈值，如 30 表示 30%
    // 企业微信机器人 webhook
    wecom_webhook: text("wecom_webhook").notNull(),
    // 状态
    is_active: varchar("is_active", { length: 10 }).notNull().default("true"),
    // 元数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alert_configs_stock_code_idx").on(table.stock_code),
    index("alert_configs_is_active_idx").on(table.is_active),
  ]
);

// 预警记录表
export const alertRecords = pgTable(
  "alert_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    config_id: varchar("config_id", { length: 36 }).references(() => alertConfigs.id, { onDelete: "cascade" }),
    stock_code: varchar("stock_code", { length: 20 }).notNull(),
    stock_name: varchar("stock_name", { length: 50 }).notNull(),
    alert_type: varchar("alert_type", { length: 50 }).notNull(), // negative_threshold
    threshold: varchar("threshold", { length: 10 }).notNull(),
    actual_value: varchar("actual_value", { length: 10 }).notNull(),
    message: text("message").notNull(),
    sent_at: timestamp("sent_at", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("alert_records_config_id_idx").on(table.config_id),
    index("alert_records_stock_code_idx").on(table.stock_code),
    index("alert_records_sent_at_idx").on(table.sent_at),
  ]
);

// 自动采集配置表
export const autoCollectConfigs = pgTable(
  "auto_collect_configs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    stock_code: varchar("stock_code", { length: 20 }).notNull(),
    stock_name: varchar("stock_name", { length: 50 }).notNull(),
    // 采集频率
    collect_interval: varchar("collect_interval", { length: 20 }).notNull().default("daily"), // daily, hourly
    collect_time: varchar("collect_time", { length: 10 }), // 采集时间，如 "09:00" 表示每天 9 点
    page_size: varchar("page_size", { length: 10 }).notNull().default("50"), // 每次采集数量
    // 状态
    is_active: varchar("is_active", { length: 10 }).notNull().default("true"),
    // 上次采集时间
    last_collected_at: timestamp("last_collected_at", { withTimezone: true }),
    // 元数据
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auto_collect_configs_stock_code_idx").on(table.stock_code),
    index("auto_collect_configs_is_active_idx").on(table.is_active),
  ]
);
