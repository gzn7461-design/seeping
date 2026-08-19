/**
 * Supabase 客户端封装
 * 支持 Supabase 和自建 PostgreSQL 两种模式
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient as getSelfHostedClient, SupabaseCompatibleClient } from "./db-client";

// 数据库类型
type DatabaseClient = SupabaseClient | SupabaseCompatibleClient;

// 单例
let clientInstance: DatabaseClient | null = null;

/**
 * 获取 Supabase 凭证
 */
function getSupabaseCredentials() {
  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("COZE_SUPABASE_URL is not set");
  }
  if (!anonKey) {
    throw new Error("COZE_SUPABASE_ANON_KEY is not set");
  }
  if (!serviceRoleKey) {
    throw new Error("COZE_SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return { url, anonKey, serviceRoleKey };
}

/**
 * 获取 Supabase 客户端（使用 service_role key，绕过 RLS）
 */
export function getSupabaseClient(): DatabaseClient {
  if (clientInstance) return clientInstance;

  // 检查是否使用自建 PostgreSQL
  if (process.env.DATABASE_URL) {
    clientInstance = getSelfHostedClient();
    return clientInstance;
  }

  const { url, serviceRoleKey } = getSupabaseCredentials();
  clientInstance = createClient(url, serviceRoleKey);
  return clientInstance;
}

/**
 * 获取 Supabase 客户端（使用 service_role key，用于服务端操作，绕过 RLS）
 */
export function getServiceRoleClient(): DatabaseClient {
  // 检查是否使用自建 PostgreSQL
  if (process.env.DATABASE_URL) {
    return getSelfHostedClient();
  }

  const { url, serviceRoleKey } = getSupabaseCredentials();
  return createClient(url, serviceRoleKey);
}

/**
 * 重置客户端（用于测试）
 */
export function resetClient(): void {
  clientInstance = null;
}
