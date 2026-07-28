# CommentHub 项目计划书

## 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | CommentHub - 评论管理与舆情监控系统 |
| 文档版本 | v1.0 |
| 创建日期 | 2026年7月28日 |
| 文档状态 | 正式发布 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [功能模块清单](#3-功能模块清单)
4. [数据库设计](#4-数据库设计)
5. [API接口清单](#5-api接口清单)
6. [功能联动关系](#6-功能联动关系)
7. [技术栈说明](#7-技术栈说明)
8. [部署方案](#8-部署方案)
9. [项目里程碑](#9-项目里程碑)

---

## 1. 项目概述

### 1.1 项目背景

CommentHub 是一个面向企业用户的评论管理与舆情监控系统，旨在帮助企业：
- 统一管理评论模板，提高评论发布效率
- 监控股票相关舆情，及时发现负面信息
- 通过企业微信机器人实现预警自动推送
- 提供数据可视化分析，辅助决策

### 1.2 项目目标

1. **评论管理**：提供评论模板的CRUD管理，支持定时发布
2. **舆情监控**：通过Excel导入评论数据，AI情感分析
3. **预警管理**：差评和敏感字预警，企业微信机器人推送
4. **数据分析**：提供可视化图表，支持多维度数据筛选

### 1.3 目标用户

- 企业运营人员
- 社交媒体管理者
- 股票分析师
- 舆情监控人员

---

## 2. 系统架构

### 2.1 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (Frontend)                       │
│  Next.js 16 + React 19 + TypeScript + shadcn/ui + Tailwind  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API层 (API Routes)                      │
│              Next.js App Router API Routes                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
─────────────────────────────────────────────────────────────┐
│                    业务逻辑层 (Business Logic)                │
│         评论管理 | 舆情分析 | 预警推送 | 数据可视化          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (Data Layer)                        │
│         Supabase (PostgreSQL) + Drizzle ORM                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    外部服务 (External Services)               │
│    AI大模型 (豆包) | 企业微信机器人 | 对象存储 | 定时任务     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                               │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                             │
│              (SSL终止 + 静态资源 + 负载均衡)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Node.js 应用服务器 (PM2)                     │
│              Next.js Production Server :3000                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase 数据库                            │
│              PostgreSQL + 对象存储 + 认证服务                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 功能模块清单

### 3.1 仪表盘模块

| 功能编号 | 功能名称 | 功能描述 | 优先级 |
|---------|---------|---------|--------|
| DASH-001 | 数据统计卡片 | 显示评论管理、舆情监控、预警管理的核心统计数据 | P0 |
| DASH-002 | 日期筛选器 | 支持今天/近7天/近30天/本季度/本年度筛选 | P0 |
| DASH-003 | 情感趋势折线图 | 显示好评/一般/差评的趋势变化 | P0 |
| DASH-004 | 情感分布饼图 | 显示情感占比分布 | P0 |
| DASH-005 | 数据联动 | 所有统计数据根据筛选日期动态更新 | P0 |

### 3.2 预警中心模块

| 功能编号 | 功能名称 | 功能描述 | 优先级 |
|---------|---------|---------|--------|
| ALERT-001 | 统计卡片 | 显示今日评论数、好评、一般、差评数量 | P0 |
| ALERT-002 | 功能导航 | 快速访问舆情监控、预警管理、敏感字库、股票管理 | P0 |
| ALERT-003 | 舆情监控 | Excel导入评论数据，AI情感分析 | P0 |
| ALERT-004 | 预警配置 | 配置差评阈值、敏感字预警、企业微信Webhook | P0 |
| ALERT-005 | 预警记录 | 查看历史预警记录 | P0 |
| ALERT-006 | 评论列表 | 显示评论数据，支持分页、筛选 | P0 |
| ALERT-007 | 评论详情 | 查看完整评论信息和AI分析结果 | P0 |
| ALERT-008 | 评论删除 | 支持单条和批量删除评论 | P0 |
| ALERT-009 | 敏感字标识 | 标记包含敏感字的评论 | P0 |
| ALERT-010 | 处理状态 | 标记差评和敏感字评论为已处理 | P0 |

### 3.3 评论管理模块

| 功能编号 | 功能名称 | 功能描述 | 优先级 |
|---------|---------|---------|--------|
| TMPL-001 | 评论模板列表 | 显示所有评论模板，支持搜索和筛选 | P0 |
| TMPL-002 | 创建模板 | 创建新的评论模板 | P0 |
| TMPL-003 | 编辑模板 | 修改现有评论模板 | P0 |
| TMPL-004 | 删除模板 | 删除评论模板 | P0 |
| TMPL-005 | 股票关联 | 模板关联股票代码和名称 | P0 |
| TMPL-006 | 分类标签 | 模板支持分类和标签管理 | P1 |
| TMPL-007 | 一键复制 | 复制模板内容到剪贴板 | P0 |
| TMPL-008 | AI生成评论 | 基于股票信息AI生成评论草稿 | P0 |
| TMPL-009 | 定时发布 | 创建定时发布任务 | P0 |
| TMPL-010 | 发布历史 | 查看发布历史记录 | P0 |

### 3.4 股票管理模块

| 功能编号 | 功能名称 | 功能描述 | 优先级 |
|---------|---------|---------|--------|
| STOCK-001 | 股票列表 | 显示所有管理的股票 | P0 |
| STOCK-002 | 添加股票 | 添加新的股票 | P0 |
| STOCK-003 | 编辑股票 | 修改股票信息 | P0 |
| STOCK-004 | 删除股票 | 删除股票 | P0 |
| STOCK-005 | 股票搜索 | 搜索股票 | P0 |

### 3.5 敏感字库模块

| 功能编号 | 功能名称 | 功能描述 | 优先级 |
|---------|---------|---------|--------|
| SENS-001 | 敏感字列表 | 显示所有敏感字 | P0 |
| SENS-002 | 添加敏感字 | 添加新的敏感字 | P0 |
| SENS-003 | 编辑敏感字 | 修改敏感字信息 | P0 |
| SENS-004 | 删除敏感字 | 删除敏感字 | P0 |
| SENS-005 | 分类管理 | 敏感字分类（通用/政治/色情/暴力/广告/垃圾） | P0 |
| SENS-006 | 级别管理 | 敏感字级别（高/中/低） | P0 |
| SENS-007 | 搜索筛选 | 搜索和筛选敏感字 | P0 |

---

## 4. 数据库设计

### 4.1 数据表清单

| 表名 | 描述 | 主要字段 |
|------|------|---------|
| comment_templates | 评论模板 | id, title, content, category, tags, stock_code, stock_name |
| publish_tasks | 发布任务 | id, template_id, content, target_url, status, scheduled_at |
| stock_comments | 股吧评论 | id, stock_code, stock_name, title, username, comment_content, sentiment, has_sensitive_words |
| alert_configs | 预警配置 | id, stock_code, stock_name, negative_threshold, wecom_webhook, alert_types |
| alert_records | 预警记录 | id, config_id, stock_code, alert_type, threshold, actual_value, message |
| sensitive_words | 敏感字库 | id, word, category, level, is_active |
| stock_list | 股票列表 | id, stock_code, stock_name, industry, market, is_active |
| auto_collect_configs | 自动采集配置 | id, stock_code, collect_interval, is_active |

### 4.2 核心表结构

#### comment_templates (评论模板表)

```sql
CREATE TABLE comment_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  tags TEXT,
  stock_code VARCHAR(20),
  stock_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### stock_comments (股吧评论表)

```sql
CREATE TABLE stock_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20),
  stock_name VARCHAR(100),
  title TEXT,
  username VARCHAR(100),
  comment_content TEXT,
  comment_time TIMESTAMP WITH TIME ZONE,
  source_url TEXT,
  read_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  sentiment VARCHAR(20),
  sentiment_score DECIMAL(5,2),
  ai_analysis TEXT,
  has_sensitive_words VARCHAR(10) DEFAULT 'false',
  sensitive_words TEXT,
  is_processed VARCHAR(10) DEFAULT 'false',
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### alert_configs (预警配置表)

```sql
CREATE TABLE alert_configs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(20),
  stock_name VARCHAR(100),
  negative_threshold DECIMAL(5,2) DEFAULT 30.00,
  wecom_webhook TEXT,
  alert_types TEXT DEFAULT 'negative,sensitive_word',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### sensitive_words (敏感字库表)

```sql
CREATE TABLE sensitive_words (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  level VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_active VARCHAR(10) NOT NULL DEFAULT 'true',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 5. API接口清单

### 5.1 评论模板接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/templates | GET | 获取模板列表 | stock_code, stock_name, category |
| /api/templates | POST | 创建模板 | title, content, category, tags, stock_code, stock_name |
| /api/templates/[id] | GET | 获取模板详情 | - |
| /api/templates/[id] | PUT | 更新模板 | title, content, category, tags, stock_code, stock_name |
| /api/templates/[id] | DELETE | 删除模板 | - |

### 5.2 发布任务接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/tasks | GET | 获取任务列表 | status, stock_code |
| /api/tasks | POST | 创建任务 | template_id, content, target_url, scheduled_at |
| /api/tasks/[id] | GET | 获取任务详情 | - |
| /api/tasks/[id] | PUT | 更新任务 | status, content |
| /api/tasks/[id] | DELETE | 删除任务 | - |

### 5.3 评论数据接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/comments | GET | 获取评论列表 | stock_code, sentiment, date, page, pageSize |
| /api/comments/batch-upload | POST | 批量上传评论 | Excel文件, stock_code, stock_name |
| /api/comments/batch-analyze | POST | 批量AI分析 | comment_ids |
| /api/comments/analyze | POST | 单条AI分析 | comment_id |
| /api/comments/[id] | GET | 获取评论详情 | - |
| /api/comments/[id] | PUT | 更新评论 | sentiment, is_processed |
| /api/comments/[id] | DELETE | 删除评论 | - |
| /api/comments/[id]/process | POST | 标记已处理 | - |
| /api/comments/stats | GET | 获取统计数据 | date, stock_code |

### 5.4 预警管理接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/alerts/configs | GET | 获取预警配置列表 | - |
| /api/alerts/configs | POST | 创建预警配置 | stock_code, stock_name, negative_threshold, wecom_webhook, alert_types |
| /api/alerts/configs/[id] | GET | 获取预警配置详情 | - |
| /api/alerts/configs/[id] | PUT | 更新预警配置 | stock_code, stock_name, negative_threshold, wecom_webhook, alert_types |
| /api/alerts/configs/[id] | DELETE | 删除预警配置 | - |
| /api/alerts/check | POST | 检查并触发预警 | stock_code |
| /api/alerts/records | GET | 获取预警记录 | alert_type, stock_code |
| /api/alerts/sensitive-records | GET | 获取敏感字预警记录 | - |
| /api/alerts/sensitive-word | POST | 敏感字预警推送 | stock_code, stock_name, comments |
| /api/alerts/check-unprocessed | POST | 检查未处理预警 | - |
| /api/alerts/test | POST | 测试机器人 | wecom_webhook, stock_code, stock_name |

### 5.5 敏感字库接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/sensitive-words | GET | 获取敏感字列表 | category, level, search |
| /api/sensitive-words | POST | 创建敏感字 | word, category, level |
| /api/sensitive-words/[id] | PUT | 更新敏感字 | word, category, level |
| /api/sensitive-words/[id] | DELETE | 删除敏感字 | - |
| /api/sensitive-words/check | POST | 检测敏感字 | text |

### 5.6 股票管理接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/stocks | GET | 获取股票列表 | search |
| /api/stocks | POST | 创建股票 | stock_code, stock_name, industry, market |
| /api/stocks/[id] | PUT | 更新股票 | stock_code, stock_name, industry, market |
| /api/stocks/[id] | DELETE | 删除股票 | - |

### 5.7 仪表盘接口

| 接口路径 | 方法 | 功能描述 | 请求参数 |
|---------|------|---------|---------|
| /api/dashboard | GET | 获取仪表盘数据 | date, stock_code |

---

## 6. 功能联动关系

### 6.1 核心业务流程

#### 6.1.1 评论上传与分析流程

```
用户上传Excel
    ↓
解析Excel数据
    ↓
查重检查（作者+主评论）
    ↓
删除旧数据，插入新数据
    ↓
敏感字检测
    ↓
触发敏感字预警（如有）
    ↓
用户点击"一键分析"
    ↓
调用AI大模型进行情感分析
    ↓
更新评论情感标签
    ↓
检查差评阈值
    ↓
触发差评预警（如超过阈值）
```

**涉及接口：**
1. `POST /api/comments/batch-upload` - 上传Excel
2. `POST /api/sensitive-words/check` - 敏感字检测
3. `POST /api/alerts/sensitive-word` - 敏感字预警推送
4. `POST /api/comments/batch-analyze` - 批量AI分析
5. `POST /api/alerts/check` - 差评预警检查

#### 6.1.2 预警配置与推送流程

```
用户配置预警规则
    ↓
选择股票（来自股票管理）
    ↓
设置差评阈值
    ↓
选择预警类型（差评/敏感字）
    ↓
配置企业微信Webhook
    ↓
系统定时检查（每30分钟）
    ↓
检查未处理差评和敏感字评论
    ↓
触发预警推送
    ↓
企业微信机器人接收消息
    ↓
用户处理评论
    ↓
标记为已处理
```

**涉及接口：**
1. `POST /api/alerts/configs` - 创建预警配置
2. `GET /api/stocks` - 获取股票列表
3. `POST /api/alerts/check-unprocessed` - 检查未处理预警
4. `POST /api/alerts/sensitive-word` - 敏感字预警
5. `POST /api/comments/[id]/process` - 标记已处理

#### 6.1.3 评论模板与定时发布流程

```
用户创建评论模板
    ↓
关联股票（来自股票管理）
    ↓
编辑评论内容
    ↓
点击"创建定时任务"
    ↓
设置发布时间
    ↓
创建发布任务
    ↓
系统定时检查
    ↓
到达发布时间
    ↓
执行发布（或提醒用户）
    ↓
记录发布历史
```

**涉及接口：**
1. `POST /api/templates` - 创建模板
2. `GET /api/stocks` - 获取股票列表
3. `POST /api/tasks` - 创建定时任务
4. `POST /api/generate-comment` - AI生成评论

#### 6.1.4 数据可视化流程

```
用户选择日期范围
    ↓
调用仪表盘API
    ↓
查询数据库统计数据
    ↓
返回统计数据和图表数据
    ↓
前端渲染统计卡片
    ↓
前端渲染折线图
    ↓
前端渲染饼图
    ↓
数据联动更新
```

**涉及接口：**
1. `GET /api/dashboard` - 获取仪表盘数据
2. `GET /api/comments/stats` - 获取评论统计

### 6.2 模块依赖关系

```
┌─────────────────────────────────────────────────────────────
│                        股票管理模块                          │
│  提供股票数据给：预警配置、评论上传、评论模板、舆情监控      │
└─────────────────────────────────────────────────────────────┘
                              ↓
─────────────────────────────────────────────────────────────┐
│                       敏感字库模块                           │
│  提供敏感字数据给：评论上传检测、预警推送                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       预警中心模块                           │
│  依赖：股票管理、敏感字库、评论数据                           │
│  功能：舆情监控、预警配置、预警记录、评论管理                 │
─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       评论管理模块                           │
│  依赖：股票管理                                               │
│  功能：模板管理、定时发布、发布历史、AI生成                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       仪表盘模块                             │
│  依赖：所有模块的统计数据                                     │
│  功能：数据可视化、趋势分析、筛选查询                         │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 数据流向图

```
                    ┌─────────────┐
                    │  用户上传   │
                    └─────────────┘
                           ↓
                    ┌─────────────┐
                    │  Excel解析  │
                    └─────────────┘
                           ↓
              ┌────────────────────────┐
              │      查重检查          │
              │  (作者+主评论)         │
              ────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │    敏感字检测          │
              │  (调用敏感字库)        │
              └────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │    数据库存储          │
              │  (stock_comments)      │
              └────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │    AI情感分析          │
              │  (调用豆包大模型)      │
              └────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │    预警检查            │
              │  (差评/敏感字)         │
              ────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │  企业微信推送          │
              │  (Webhook)             │
              └────────────────────────┘
```

---

## 7. 技术栈说明

### 7.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | React框架，App Router |
| React | 19 | UI组件库 |
| TypeScript | 5 | 类型安全 |
| shadcn/ui | 最新 | UI组件库 |
| Tailwind CSS | 4 | 样式框架 |
| Recharts | 2.x | 图表库 |
| Lucide React | 最新 | 图标库 |
| XLSX | 0.18.x | Excel解析 |

### 7.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 24 | 运行时环境 |
| Next.js API Routes | 16 | API服务 |
| Drizzle ORM | 最新 | 数据库ORM |
| Supabase | 最新 | 数据库服务 |
| PostgreSQL | 14+ | 关系数据库 |

### 7.3 外部服务

| 服务 | 用途 | 调用方式 |
|------|------|---------|
| 豆包大模型 | AI情感分析、评论生成 | HTTP API |
| 企业微信机器人 | 预警消息推送 | Webhook |
| 对象存储 | 文件存储 | S3兼容API |

---

## 8. 部署方案

### 8.1 环境要求

| 组件 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核 |
| 内存 | 4GB | 8GB |
| 磁盘 | 20GB | 50GB |
| Node.js | 18+ | 24 |
| PostgreSQL | 14+ | 16 |

### 8.2 部署步骤

1. **环境准备**
   - 安装Node.js 18+
   - 安装pnpm 8+
   - 配置PostgreSQL数据库

2. **代码部署**
   ```bash
   git clone <repository>
   cd CommentHub
   pnpm install
   ```

3. **环境变量配置**
   ```bash
   COZE_SUPABASE_URL=your_supabase_url
   COZE_SUPABASE_ANON_KEY=your_anon_key
   COZE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   COZE_LLM_API_KEY=your_llm_api_key
   ```

4. **构建与启动**
   ```bash
   pnpm run build
   pnpm run start
   ```

5. **Nginx配置**
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 9. 项目里程碑

### 9.1 第一阶段：基础功能（已完成）

- [x] 项目初始化
- [x] 数据库设计
- [x] 评论模板CRUD
- [x] 定时发布任务
- [x] 发布历史记录
- [x] 仪表盘基础统计

### 9.2 第二阶段：舆情监控（已完成）

- [x] Excel导入评论
- [x] AI情感分析
- [x] 敏感字库管理
- [x] 敏感字检测
- [x] 预警配置管理
- [x] 企业微信推送

### 9.3 第三阶段：功能优化（已完成）

- [x] 评论查重功能
- [x] 预警中心整合
- [x] 评论管理整合
- [x] 数据可视化图表
- [x] 告警消息美化
- [x] 评论删除功能

### 9.4 第四阶段：未来规划

- [ ] 自动采集功能完善
- [ ] 多平台评论支持
- [ ] 用户权限管理
- [ ] 数据导出功能
- [ ] 移动端适配
- [ ] 实时推送优化

---

## 附录

### A. 错误码说明

| 错误码 | 描述 | 解决方案 |
|--------|------|---------|
| 400 | 请求参数错误 | 检查请求参数格式 |
| 401 | 未授权 | 检查认证信息 |
| 404 | 资源不存在 | 检查资源ID |
| 500 | 服务器内部错误 | 查看服务器日志 |

### B. 环境变量清单

| 变量名 | 描述 | 必填 |
|--------|------|------|
| COZE_SUPABASE_URL | Supabase项目URL | 是 |
| COZE_SUPABASE_ANON_KEY | Supabase匿名密钥 | 是 |
| COZE_SUPABASE_SERVICE_ROLE_KEY | Supabase服务角色密钥 | 是 |
| COZE_LLM_API_KEY | AI大模型API密钥 | 是 |

### C. 参考资料

- Next.js官方文档：https://nextjs.org/docs
- Supabase官方文档：https://supabase.com/docs
- shadcn/ui组件库：https://ui.shadcn.com
- Recharts图表库：https://recharts.org

---

**文档结束**
