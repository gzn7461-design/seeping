-- CommentHub 数据库建表 DDL
-- 导出时间: 2026-08-19 5:46:08 PM

-- 1. 股票列表
CREATE TABLE IF NOT EXISTS stock_list (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 评论模板
CREATE TABLE IF NOT EXISTS comment_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  tags TEXT,
  stock_code VARCHAR(20),
  stock_name VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 发布任务
CREATE TABLE IF NOT EXISTS publish_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(36) REFERENCES comment_templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_platform VARCHAR(50) NOT NULL DEFAULT 'eastmoney',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  stock_code VARCHAR(20),
  stock_name VARCHAR(50),
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 股吧评论
CREATE TABLE IF NOT EXISTS stock_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  username VARCHAR(100) NOT NULL,
  comment_content TEXT NOT NULL,
  comment_time TIMESTAMPTZ NOT NULL,
  source_url TEXT,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  sentiment_score VARCHAR(10),
  ai_analysis TEXT,
  read_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  title TEXT,
  has_sensitive_words VARCHAR(10) DEFAULT 'false',
  sensitive_words TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 敏感字库
CREATE TABLE IF NOT EXISTS sensitive_words (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  level VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 预警配置
CREATE TABLE IF NOT EXISTS alert_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  negative_threshold VARCHAR(10) NOT NULL DEFAULT '30',
  check_interval VARCHAR(10) NOT NULL DEFAULT '30',
  wecom_webhook TEXT NOT NULL,
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 预警记录
CREATE TABLE IF NOT EXISTS alert_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id VARCHAR(36) REFERENCES alert_configs(id) ON DELETE CASCADE,
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  threshold VARCHAR(10) NOT NULL,
  actual_value VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. 自动采集配置
CREATE TABLE IF NOT EXISTS auto_collect_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  collect_interval VARCHAR(20) NOT NULL DEFAULT 'daily',
  collect_time VARCHAR(10),
  page_size VARCHAR(10) NOT NULL DEFAULT '50',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  last_collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS stock_list_code_idx ON stock_list(stock_code);
CREATE INDEX IF NOT EXISTS comment_templates_category_idx ON comment_templates(category);
CREATE INDEX IF NOT EXISTS comment_templates_stock_code_idx ON comment_templates(stock_code);
CREATE INDEX IF NOT EXISTS publish_tasks_status_idx ON publish_tasks(status);
CREATE INDEX IF NOT EXISTS publish_tasks_scheduled_at_idx ON publish_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS publish_tasks_stock_code_idx ON publish_tasks(stock_code);
CREATE INDEX IF NOT EXISTS stock_comments_stock_code_idx ON stock_comments(stock_code);
CREATE INDEX IF NOT EXISTS stock_comments_sentiment_idx ON stock_comments(sentiment);
CREATE INDEX IF NOT EXISTS stock_comments_comment_time_idx ON stock_comments(comment_time);
CREATE INDEX IF NOT EXISTS stock_comments_has_sensitive_words_idx ON stock_comments(has_sensitive_words);
CREATE INDEX IF NOT EXISTS sensitive_words_word_idx ON sensitive_words(word);
CREATE INDEX IF NOT EXISTS alert_configs_stock_code_idx ON alert_configs(stock_code);
CREATE INDEX IF NOT EXISTS alert_records_sent_at_idx ON alert_records(sent_at);
CREATE INDEX IF NOT EXISTS auto_collect_configs_stock_code_idx ON auto_collect_configs(stock_code);
CREATE INDEX IF NOT EXISTS auto_collect_configs_is_active_idx ON auto_collect_configs(is_active);
