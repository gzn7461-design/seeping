# CommentHub 私有化部署手册

## 一、环境要求

### 1.1 服务器配置
- **操作系统**: Ubuntu 20.04+ / Debian 11+ / CentOS 7+
- **Node.js**: 24.x 或更高版本
- **pnpm**: 9.x 或更高版本
- **PostgreSQL**: 14.x 或更高版本（或使用 Supabase 云服务）
- **Nginx**: 1.18+（可选，用于反向代理 + HTTPS）

### 1.2 推荐配置
| 场景 | CPU | 内存 | 磁盘 | 带宽 |
|------|-----|------|------|------|
| 小规模（日处理<1000条） | 2核 | 4GB | 20GB | 5Mbps |
| 中等规模（日处理<5000条） | 4核 | 8GB | 50GB | 10Mbps |
| 大规模（日处理>5000条） | 8核 | 16GB | 100GB+ | 20Mbps+ |

---

## 二、数据库准备

### 方案A：使用 Supabase 云服务（推荐）

1. 访问 [Supabase](https://supabase.com) 注册账号
2. 创建新项目，获取以下信息：
   - `COZE_SUPABASE_URL` — 项目 URL（格式：`https://xxxx.supabase.co`）
   - `COZE_SUPABASE_ANON_KEY` — 匿名密钥
   - `COZE_SUPABASE_SERVICE_ROLE_KEY` — 服务角色密钥（用于 RLS 绕过）

3. 在 Supabase SQL Editor 中依次执行以下 SQL 创建表结构：

```sql
-- ==================== 股票列表 ====================
CREATE TABLE IF NOT EXISTS stock_list (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stock_list_code_idx ON stock_list(stock_code);

-- ==================== 评论模板 ====================
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

-- ==================== 发布任务 ====================
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

-- ==================== 股吧评论（核心表） ====================
CREATE TABLE IF NOT EXISTS stock_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  title TEXT,
  username VARCHAR(100) NOT NULL,
  comment_content TEXT NOT NULL,
  comment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  source_url TEXT,
  read_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  sentiment_score VARCHAR(10),
  ai_analysis TEXT,
  has_sensitive_words VARCHAR(10) DEFAULT 'false',
  sensitive_words TEXT,
  is_processed VARCHAR(10) DEFAULT 'false',
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stock_comments_stock_code_idx ON stock_comments(stock_code);
CREATE INDEX IF NOT EXISTS stock_comments_sentiment_idx ON stock_comments(sentiment);
CREATE INDEX IF NOT EXISTS stock_comments_comment_time_idx ON stock_comments(comment_time);
CREATE INDEX IF NOT EXISTS stock_comments_has_sensitive_words_idx ON stock_comments(has_sensitive_words);
CREATE INDEX IF NOT EXISTS stock_comments_is_processed_idx ON stock_comments(is_processed);

-- ==================== 预警配置 ====================
CREATE TABLE IF NOT EXISTS alert_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20) NOT NULL,
  stock_name VARCHAR(50) NOT NULL,
  negative_threshold VARCHAR(10) NOT NULL DEFAULT '30',
  check_interval VARCHAR(10) NOT NULL DEFAULT '30',
  alert_types TEXT DEFAULT '["negative","sensitive"]',
  wecom_webhook TEXT NOT NULL,
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  daily_push_enabled VARCHAR(5) DEFAULT 'false',
  daily_push_time VARCHAR(5) DEFAULT NULL,
  check_negative VARCHAR(5) DEFAULT 'true',
  check_sensitive VARCHAR(5) DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alert_configs_stock_code_idx ON alert_configs(stock_code);
CREATE INDEX IF NOT EXISTS alert_configs_is_active_idx ON alert_configs(is_active);

-- ==================== 预警记录 ====================
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

-- ==================== 自动采集配置 ====================
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

-- ==================== 敏感字库 ====================
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

-- ==================== 默认数据 ====================
-- 插入默认敏感字
INSERT INTO sensitive_words (word, category, level) VALUES
('骗子', 'spam', 'high'),
('垃圾', 'spam', 'medium'),
('有毒', 'violent', 'medium'),
('崩盘', 'general', 'high'),
('割肉', 'general', 'medium')
ON CONFLICT DO NOTHING;
```

### 方案B：自建 PostgreSQL

1. 安装 PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# CentOS
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

2. 创建数据库和用户
```bash
sudo -u postgres psql
CREATE DATABASE commenthub;
CREATE USER commenthub_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE commenthub TO commenthub_user;
\c commenthub
GRANT ALL ON SCHEMA public TO commenthub_user;
\q
```

3. 执行上述 SQL 创建表结构

---

## 三、项目部署

### 3.1 获取代码

```bash
# 方式1：从 Git 仓库克隆
git clone <your_repository_url>
cd commenthub

# 方式2：上传代码包
# 将代码压缩包上传到服务器后解压
tar -xzf commenthub.tar.gz
cd commenthub
```

### 3.2 安装 Node.js 和 pnpm

```bash
# 安装 Node.js 24.x（使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24

# 安装 pnpm
npm install -g pnpm@latest

# 验证安装
node -v   # 应显示 v24.x.x
pnpm -v   # 应显示 9.x.x
```

### 3.3 安装依赖

```bash
cd /path/to/commenthub
pnpm install
```

### 3.4 配置环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local 2>/dev/null || touch .env.local
nano .env.local
```

填入以下配置：

```env
# ===== Supabase 配置（使用 Supabase 云服务时填写） =====
COZE_SUPABASE_URL=https://your-project.supabase.co
COZE_SUPABASE_ANON_KEY=your_anon_key
COZE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===== 自建 PostgreSQL（与 Supabase 二选一） =====
# DATABASE_URL=postgresql://commenthub_user:your_password@localhost:5432/commenthub

# ===== 应用配置 =====
NEXT_PUBLIC_APP_URL=http://your-domain.com   # 对外访问域名
DEPLOY_RUN_PORT=5000                         # 运行端口（默认5000）
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

# 方式2：使用 PM2 进程管理（推荐生产环境）
npm install -g pm2
pm2 start pnpm --name "commenthub" -- start
pm2 save
pm2 startup
```

### 3.7 验证部署

访问 `http://your-server-ip:5000`，如果看到 CommentHub 界面，说明部署成功。

---

## 四、Nginx 反向代理 + HTTPS（强烈推荐）

### 4.1 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.2 配置反向代理

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/commenthub
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 请求大小限制（上传 Excel 文件需要）
    client_max_body_size 50m;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://localhost:5000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/commenthub /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # 删除默认站点
sudo nginx -t
sudo systemctl restart nginx
```

### 4.3 配置 SSL（HTTPS）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run

# 设置定时任务自动续期（Certbot 已自动添加 systemd timer）
sudo systemctl status certbot.timer
```

### 4.4 更新域名配置

修改 `.env.local` 中的 `NEXT_PUBLIC_APP_URL` 为 HTTPS 域名：

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

重启服务：

```bash
pm2 restart commenthub
```

---

## 五、防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp          # SSH
sudo ufw allow 80/tcp          # HTTP
sudo ufw allow 443/tcp         # HTTPS
sudo ufw allow 5000/tcp        # 应用端口（可选，Nginx 代理后可关闭）
sudo ufw --force enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

> **安全建议**：配置 Nginx 反向代理后，应关闭 5000 端口对外暴露，仅保留 80/443 端口。

---

## 六、常用运维命令

### 6.1 PM2 管理

```bash
pm2 status                    # 查看所有服务状态
pm2 logs commenthub           # 查看实时日志
pm2 logs commenthub --lines 100  # 查看最近100行日志
pm2 restart commenthub        # 重启服务
pm2 stop commenthub           # 停止服务
pm2 delete commenthub         # 删除服务
pm2 monit                     # 实时监控（CPU/内存）
```

### 6.2 更新部署

```bash
# 1. 进入项目目录
cd /path/to/commenthub

# 2. 拉取最新代码
git pull

# 3. 安装新依赖（如有变更）
pnpm install

# 4. 重新构建
pnpm build

# 5. 重启服务
pm2 restart commenthub

# 6. 检查日志确认无报错
pm2 logs commenthub --lines 50
```

### 6.3 数据库备份

```bash
# Supabase 用户：在 Dashboard 中手动备份，或使用 Supabase CLI

# 自建 PostgreSQL 用户
# 备份
pg_dump -U commenthub_user commenthub > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复
psql -U commenthub_user commenthub < backup_20250101.sql

# 定时备份（crontab）
crontab -e
# 添加以下行，每天凌晨3点备份
0 3 * * * pg_dump -U commenthub_user commenthub > /backup/commenthub_$(date +\%Y\%m\%d).sql
```

---

## 七、故障排查

### 7.1 服务无法启动

```bash
# 查看错误日志
pm2 logs commenthub --lines 100

# 检查端口占用
sudo lsof -i :5000

# 检查 Node.js 版本
node -v

# 尝试直接启动看报错
pnpm start
```

### 7.2 数据库连接失败

```bash
# 检查环境变量配置
cat .env.local

# 测试数据库连接（自建 PostgreSQL）
psql -h localhost -U commenthub_user -d commenthub -c "SELECT 1"

# 测试 Supabase 连接
curl -s -X GET "$SUPABASE_URL/rest/v1/stock_comments?select=count" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### 7.3 页面访问 502/504

```bash
# 1. 检查服务是否运行
pm2 status

# 2. 检查 Nginx 配置
sudo nginx -t

# 3. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 4. 检查应用日志
pm2 logs commenthub --lines 50

# 5. 常见原因
#    - 服务未启动 → pm2 start commenthub
#    - 端口不对 → 检查 Nginx proxy_pass 端口是否与 DEPLOY_RUN_PORT 一致
#    - 请求超时 → 增加 proxy_read_timeout（大文件上传需要）
```

### 7.4 上传 Excel 失败

```bash
# 1. 检查 Nginx 请求大小限制
# 在 Nginx 配置中添加：client_max_body_size 50m;

# 2. 检查 Excel 格式
#    - 必须包含列：作者、评论内容、时间
#    - 可选列：标题、链接、阅读、回复

# 3. 查看应用日志
pm2 logs commenthub --lines 50
```

### 7.5 日期字段错误：`value.toISOString is not a function`

**问题现象**：
```
Failed to fetch comments: { message: 'value.toISOString is not a function', code: undefined }
GET /api/comments?page=1&pageSize=20&date=today 500
GET /api/dashboard?date=today 500
```

**根本原因**：
使用自建 PostgreSQL 时，`postgres` 库返回的 `timestamp` 字段是字符串格式（如 `"2026-08-19 17:48:00"`），而不是 `Date` 对象。当代码中对这些字符串调用 `.toISOString()` 时就会报错。

**解决方案**：
代码已修复，在 `src/storage/database/db-client.ts` 中添加了日期转换逻辑：
1. 在 `postgres` 客户端配置中添加 `types` 选项，自动将 timestamp 转换为 Date 对象
2. 在 `execute` 方法中添加 `convertDates` 函数，遍历查询结果自动转换日期字段

**如果仍然报错**：
```bash
# 1. 确认代码是最新的
cd /opt/commenthub
git pull origin main  # 如果有 git

# 2. 重新安装依赖
pnpm install

# 3. 重新构建
pnpm run build

# 4. 重启服务
pm2 restart commenthub

# 5. 验证修复
curl -s http://localhost:5000/api/comments?page=1
```

### 7.6 AI 分析失败

```bash
# 1. 检查网络连接（AI 模型需要联网）
curl -s --max-time 5 https://api.coze.cn

# 2. 检查 API Key 配置
#    AI 模型通过 coze-coding-dev-sdk 调用，无需额外配置
#    确保服务器能正常访问 coze API

# 3. 查看错误日志
pm2 logs commenthub --lines 50 | grep -i "analyze\|llm\|ai"
```

---

## 八、新增功能说明

### 1. 评论整体分析（AI 舆情报告）
- **接口**：`POST /api/comments/overall-analysis`
- **功能**：选择时间段，AI 自动分析该时段内所有评论的整体舆情趋势
- **请求参数**：`{ "start_date": "2026-07-01", "end_date": "2026-08-11" }`
- **响应**：返回评论总数、情感分布、敏感词统计、AI 分析报告
- **前端位置**：预警中心 → 舆情监控 → 整体分析

### 2. 每日数据推送（企微机器人）
- **配置方式**：预警配置弹窗中新增「每日推送」设置项
- **字段说明**：
  - `daily_push_enabled`：是否启用每日推送（"true"/"false"）
  - `daily_push_time`：推送时间，格式 HH:mm（如 "09:00"）
- **推送内容**：当日评论数据汇总 + AI 整体分析报告
  ```
  【2026.08.11】舆论监控平台运行情况
  今日股吧评论 48 条
  AI 情感分析：好评 15 条，一般 18 条，差评 15 条
  无敏感字
  --- 整体分析 ---
  （AI 自动生成的舆情分析报告）
  ```
- **定时机制**：前端每分钟检查一次，到达设定时间时触发推送

### 3. 情感分析优化
- **提示词优化**：降低 temperature 至 0.3，减少随机性，提高一致性
- **自动分析**：上传评论时自动触发 AI 分析，无需手动点击"批量分析"
- **手动修改**：支持在详情弹窗中手动修改情感分类，同时触发 AI 重新分析
- **进度条**：批量分析时显示实时进度条

### 4. 数据库新增字段
```sql
-- alert_configs 表新增字段
ALTER TABLE alert_configs ADD COLUMN IF NOT EXISTS daily_push_time varchar(5) DEFAULT NULL;
ALTER TABLE alert_configs ADD COLUMN IF NOT EXISTS daily_push_enabled varchar(5) DEFAULT 'false';
```

---

## 九、安全建议

1. **修改默认端口**：生产环境不要使用 5000 端口对外暴露，通过 Nginx 反向代理
2. **配置防火墙**：只开放必要端口（22/80/443）
3. **强制 HTTPS**：生产环境必须配置 SSL 证书
4. **定期备份**：每天自动备份数据库
5. **更新依赖**：定期运行 `pnpm update` 更新依赖
6. **监控日志**：使用 PM2 管理日志，设置日志轮转
7. **限制访问**：管理后台建议通过 VPN 或 IP 白名单限制访问
8. **密钥管理**：`.env.local` 文件设置 600 权限，防止泄露
9. **数据库安全**：使用强密码，限制数据库只允许本地连接

---

## 九、性能优化

### 9.1 Node.js 优化

```bash
# 使用 cluster 多进程模式
pm2 start pnpm --name "commenthub" -i max -- start

# 设置内存限制
pm2 start pnpm --name "commenthub" --max-memory-restart 1G -- start
```

### 9.2 Nginx 优化

```nginx
# 在 http 块中添加
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1000;
gzip_comp_level 6;

# 在 server 块中添加
# 静态资源缓存
location /_next/static/ {
    proxy_pass http://localhost:5000;
    expires 365d;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    proxy_pass http://localhost:5000;
    proxy_cache_bypass $http_upgrade;
    # API 不缓存
    add_header Cache-Control "no-store";
}
```

### 9.3 数据库优化

```sql
-- 定期清理超过 90 天的评论数据
DELETE FROM stock_comments WHERE created_at < NOW() - INTERVAL '90 days';

-- 清理旧的预警记录
DELETE FROM alert_records WHERE created_at < NOW() - INTERVAL '30 days';

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM stock_comments WHERE stock_code = '000001' AND comment_time > NOW() - INTERVAL '7 days';
```

### 9.4 数据归档建议

对于长期运行的实例，建议定期归档历史数据：

```bash
# 创建归档脚本 archive.sh
#!/bin/bash
DATE=$(date +%Y%m%d)
DB_NAME="commenthub"
DB_USER="commenthub_user"

# 导出旧数据
pg_dump -U $DB_USER --data-only --table=stock_comments \
  --where="created_at < NOW() - INTERVAL '90 days'" \
  $DB_NAME > /backup/archive_$DATE.sql

# 删除旧数据
psql -U $DB_USER -d $DB_NAME -c "DELETE FROM stock_comments WHERE created_at < NOW() - INTERVAL '90 days';"

# 清理归档（保留30天）
find /backup -name "archive_*.sql" -mtime +30 -delete
```

---

## 十、系统架构概述

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  浏览器/用户   │─────▶│   Nginx      │─────▶│  Next.js App │
│  (HTTPS)      │      │  (反向代理)   │      │  (端口5000)  │
└──────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │ Supabase │  │   AI     │  │ 企业微信  │
                              │ 数据库    │  │  模型     │  │ 机器人    │
                              └──────────┘  └──────────┘  └──────────┘
```

### 功能模块
| 模块 | 说明 | 数据源 |
|------|------|--------|
| 仪表盘 | 数据统计与图表 | stock_comments / alert_configs |
| 评论管理 | 模板CRUD + 定时发布 + 发布历史 | comment_templates / publish_tasks |
| 预警中心 | 评论监控 + AI分析 + 预警配置 + 敏感字检测 | stock_comments / alert_configs / sensitive_words |
| 股票管理 | 股票代码维护 | stock_list |
| 敏感字库 | 敏感词管理 | sensitive_words |

### 核心流程
```
Excel上传 → 敏感字检测 → AI情感分析 → 情感分类(好评/一般/差评)
                                              ↓
                             差评/敏感字 → 预警检查 → 企微机器人通知
```

---

## 十一、联系支持

如遇到部署问题，请依次检查：

1. **服务运行状态**: `pm2 status`
2. **应用日志**: `pm2 logs commenthub --lines 100`
3. **Nginx 日志**: `sudo tail -100 /var/log/nginx/error.log`
4. **数据库连接**: `psql -h localhost -U commenthub_user -d commenthub -c "SELECT 1"`
5. **环境变量**: `cat .env.local | grep -v KEY`