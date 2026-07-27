# CommentHub 部署操作手册

## 一、环境要求

### 1.1 服务器配置
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 11+
- **Node.js**: 18.x 或更高版本
- **pnpm**: 8.x 或更高版本
- **PostgreSQL**: 14.x 或更高版本（或使用 Supabase）
- **Nginx**: 1.18+（可选，用于反向代理）

### 1.2 推荐配置
- CPU: 2核+
- 内存: 4GB+
- 磁盘: 20GB+
- 带宽: 5Mbps+

---

## 二、数据库准备

### 方案A：使用 Supabase（推荐）

1. 访问 [Supabase](https://supabase.com) 注册账号
2. 创建新项目，获取以下信息：
   - `SUPABASE_URL` - 项目URL
   - `SUPABASE_ANON_KEY` - 匿名密钥
   - `SUPABASE_SERVICE_ROLE_KEY` - 服务角色密钥

3. 在 Supabase SQL Editor 中执行以下SQL创建表结构：

```sql
-- 股票列表
CREATE TABLE IF NOT EXISTS stock_list (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_list_code_idx ON stock_list(stock_code);

-- 评论模板
CREATE TABLE IF NOT EXISTS comment_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  tags TEXT,
  stock_code VARCHAR(20),
  stock_name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comment_templates_category_idx ON comment_templates(category);
CREATE INDEX IF NOT EXISTS comment_templates_stock_code_idx ON comment_templates(stock_code);

-- 发布任务
CREATE TABLE IF NOT EXISTS publish_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(36) REFERENCES comment_templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_platform VARCHAR(50) NOT NULL DEFAULT 'eastmoney',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  stock_code VARCHAR(20),
  stock_name VARCHAR(50),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS publish_tasks_status_idx ON publish_tasks(status);
CREATE INDEX IF NOT EXISTS publish_tasks_scheduled_at_idx ON publish_tasks(scheduled_at);

-- 股吧评论
CREATE TABLE IF NOT EXISTS stock_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  username VARCHAR(100) NOT NULL,
  comment_content TEXT NOT NULL,
  comment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  source_url TEXT,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  sentiment_score VARCHAR(10),
  ai_analysis TEXT,
  read_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  title TEXT,
  has_sensitive_words VARCHAR(10) DEFAULT 'false',
  sensitive_words TEXT,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_comments_stock_code_idx ON stock_comments(stock_code);
CREATE INDEX IF NOT EXISTS stock_comments_sentiment_idx ON stock_comments(sentiment);
CREATE INDEX IF NOT EXISTS stock_comments_comment_time_idx ON stock_comments(comment_time);
CREATE INDEX IF NOT EXISTS stock_comments_has_sensitive_words_idx ON stock_comments(has_sensitive_words);

-- 预警配置
CREATE TABLE IF NOT EXISTS alert_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  negative_threshold VARCHAR(10) NOT NULL DEFAULT '30',
  wecom_webhook TEXT NOT NULL,
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_configs_stock_code_idx ON alert_configs(stock_code);
CREATE INDEX IF NOT EXISTS alert_configs_is_active_idx ON alert_configs(is_active);

-- 预警记录
CREATE TABLE IF NOT EXISTS alert_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id VARCHAR(36) REFERENCES alert_configs(id) ON DELETE CASCADE,
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  threshold VARCHAR(10) NOT NULL,
  actual_value VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_records_config_id_idx ON alert_records(config_id);
CREATE INDEX IF NOT EXISTS alert_records_stock_code_idx ON alert_records(stock_code);

-- 自动采集配置
CREATE TABLE IF NOT EXISTS auto_collect_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  collect_interval VARCHAR(20) NOT NULL DEFAULT 'daily',
  collect_time VARCHAR(10),
  page_size VARCHAR(10) NOT NULL DEFAULT '50',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  last_collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auto_collect_configs_stock_code_idx ON auto_collect_configs(stock_code);
CREATE INDEX IF NOT EXISTS auto_collect_configs_is_active_idx ON auto_collect_configs(is_active);

-- 敏感字库
CREATE TABLE IF NOT EXISTS sensitive_words (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  level VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sensitive_words_word_idx ON sensitive_words(word);
CREATE INDEX IF NOT EXISTS sensitive_words_category_idx ON sensitive_words(category);
CREATE INDEX IF NOT EXISTS sensitive_words_is_active_idx ON sensitive_words(is_active);

-- 插入默认敏感字示例
INSERT INTO sensitive_words (word, category, level) VALUES
('骗子', 'spam', 'high'),
('垃圾', 'spam', 'medium'),
('有毒', 'violent', 'medium'),
('崩盘', 'general', 'high'),
('割肉', 'general', 'medium')
ON CONFLICT (word) DO NOTHING;
```

### 方案B：自建 PostgreSQL

1. 安装 PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
```

2. 创建数据库和用户
```bash
sudo -u postgres psql
CREATE DATABASE commenthub;
CREATE USER commenthub_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE commenthub TO commenthub_user;
\c commenthub
GRANT ALL ON SCHEMA public TO commenthub_user;
```

3. 执行上述SQL创建表结构

---

## 三、代码部署

### 3.1 获取代码

```bash
# 方式1：从Git仓库克隆
git clone <your_repository_url>
cd commenthub

# 方式2：直接上传代码包
# 将代码打包上传到服务器后解压
```

### 3.2 安装 Node.js 和 pnpm

```bash
# 安装 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 pnpm
npm install -g pnpm

# 验证安装
node -v  # 应显示 v18.x.x
pnpm -v  # 应显示 8.x.x
```

### 3.3 安装依赖

```bash
cd /path/to/commenthub
pnpm install
```

### 3.4 配置环境变量

创建 `.env` 文件：

```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件，填入以下配置：

```env
# Supabase 配置（使用Supabase时填写）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 或者使用自建 PostgreSQL（二选一）
# DATABASE_URL=postgresql://commenthub_user:your_password@localhost:5432/commenthub

# 应用配置
NEXT_PUBLIC_APP_URL=http://your-domain.com
DEPLOY_RUN_PORT=3000

# AI 模型配置（如需要）
# COZE_API_KEY=your_coze_api_key
```

### 3.5 构建项目

```bash
# 生产环境构建
pnpm build
```

### 3.6 启动服务

```bash
# 方式1：直接启动（测试用）
pnpm start

# 方式2：使用 PM2 进程管理（推荐）
npm install -g pm2
pm2 start npm --name "commenthub" -- start
pm2 save
pm2 startup
```

---

## 四、Nginx 反向代理配置（可选）

### 4.1 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS
sudo yum install nginx
```

### 4.2 配置反向代理

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/commenthub
```

填入以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/commenthub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4.3 配置 SSL（HTTPS）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 五、防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 六、常用运维命令

### 6.1 PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs commenthub

# 重启服务
pm2 restart commenthub

# 停止服务
pm2 stop commenthub

# 删除服务
pm2 delete commenthub
```

### 6.2 更新部署

```bash
# 拉取最新代码
cd /path/to/commenthub
git pull

# 安装新依赖
pnpm install

# 重新构建
pnpm build

# 重启服务
pm2 restart commenthub
```

### 6.3 数据库备份

```bash
# Supabase: 在 Dashboard 中手动备份或使用 API

# 自建 PostgreSQL
pg_dump -U commenthub_user commenthub > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U commenthub_user commenthub < backup_20240101.sql
```

---

## 七、故障排查

### 7.1 服务无法启动

```bash
# 查看错误日志
pm2 logs commenthub --lines 100

# 检查端口占用
sudo lsof -i :3000

# 检查 Node.js 版本
node -v
```

### 7.2 数据库连接失败

```bash
# 检查环境变量
cat .env

# 测试数据库连接
psql -h your-db-host -U commenthub_user -d commenthub
```

### 7.3 页面访问 502

```bash
# 检查服务是否运行
pm2 status

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 八、安全建议

1. **修改默认端口**: 不要使用 3000 端口对外暴露
2. **配置防火墙**: 只开放必要端口
3. **使用 HTTPS**: 生产环境必须配置 SSL
4. **定期备份**: 每天自动备份数据库
5. **更新依赖**: 定期运行 `pnpm update` 更新依赖
6. **监控日志**: 使用 PM2 或 systemd 管理服务日志
7. **限制访问**: 管理后台建议限制 IP 访问

---

## 九、性能优化

### 9.1 Node.js 优化

```bash
# 使用 cluster 模式运行
pm2 start npm --name "commenthub" -i max -- start
```

### 9.2 Nginx 优化

在 Nginx 配置中添加：

```nginx
# 启用 gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 设置缓存
location /_next/static/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

### 9.3 数据库优化

```sql
-- 添加必要的索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_comments_created_at ON stock_comments(created_at DESC);

-- 定期清理旧数据
DELETE FROM stock_comments WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 十、联系支持

如遇到问题，请检查：
1. 服务器日志: `pm2 logs commenthub`
2. Nginx 日志: `/var/log/nginx/error.log`
3. 数据库连接状态
4. 环境变量配置是否正确
