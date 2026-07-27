-- 创建敏感字库表
CREATE TABLE IF NOT EXISTS sensitive_words (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  level VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS sensitive_words_word_idx ON sensitive_words(word);
CREATE INDEX IF NOT EXISTS sensitive_words_category_idx ON sensitive_words(category);
CREATE INDEX IF NOT EXISTS sensitive_words_is_active_idx ON sensitive_words(is_active);

-- 为stock_comments表添加敏感字相关字段
ALTER TABLE stock_comments ADD COLUMN IF NOT EXISTS has_sensitive_words VARCHAR(10) DEFAULT 'false';
ALTER TABLE stock_comments ADD COLUMN IF NOT EXISTS sensitive_words TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS stock_comments_has_sensitive_words_idx ON stock_comments(has_sensitive_words);

-- 插入一些默认的敏感字示例
INSERT INTO sensitive_words (word, category, level) VALUES
('骗子', 'spam', 'high'),
('垃圾', 'spam', 'medium'),
('有毒', 'violent', 'medium'),
('崩盘', 'general', 'high'),
('割肉', 'general', 'medium')
ON CONFLICT (word) DO NOTHING;
