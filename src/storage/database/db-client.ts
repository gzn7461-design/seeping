/**
 * 统一数据库客户端
 * 支持 Supabase 和自建 PostgreSQL
 * 提供 Supabase 兼容的查询接口
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./shared/schema";
import {
  eq,
  desc,
  asc,
  and,
  inArray,
  gte,
  lte,
  like,
  ilike,
  isNull,
  isNotNull,
  sql,
  type SQL,
  count,
} from "drizzle-orm";

// 数据库类型
type Database = PostgresJsDatabase<typeof schema>;

// 单例
let dbInstance: Database | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

/**
 * 获取数据库实例
 */
export function getDb(): Database {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  sqlInstance = postgres(databaseUrl, {
    max: 10,
  });
  dbInstance = drizzle(sqlInstance, {
    schema,
    logger: false,
  });

  return dbInstance;
}

/**
 * 关闭数据库连接
 */
export async function closeDb(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
    dbInstance = null;
  }
}

// ==================== Supabase 兼容查询构建器 ====================

type OrderDirection = "asc" | "desc";
type OrderOptions = { ascending?: boolean };

interface QueryResult<T> {
  data: T | T[] | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

class SupabaseQueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  private db: Database;
  private table: any;
  private tableName: string;
  private conditions: SQL[] = [];
  private selectColumns: string[] | null = null;
  private orderByField: string | null = null;
  private orderByDirection: OrderDirection = "desc";
  private insertData: any[] | null = null;
  private updateData: any | null = null;
  private deleteMode = false;
  private singleMode = false;
  private limitCount: number | null = null;
  countMode: "exact" | "planned" | "estimated" | false = false;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;

  constructor(db: Database, table: any, tableName: string) {
    this.db = db;
    this.table = table;
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    if (columns && columns !== "*") {
      this.selectColumns = columns.split(",").map((c) => c.trim());
    }
    if (options?.count) {
      this.countMode = options.count;
    }
    return this;
  }

  eq(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(eq(column, value));
    }
    return this;
  }

  neq(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(sql`${column} != ${value}`);
    }
    return this;
  }

  gt(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(sql`${column} > ${value}`);
    }
    return this;
  }

  gte(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(gte(column, value));
    }
    return this;
  }

  lt(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(sql`${column} < ${value}`);
    }
    return this;
  }

  lte(field: string, value: any): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(lte(column, value));
    }
    return this;
  }

  in(field: string, values: any[]): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(inArray(column, values));
    }
    return this;
  }

  like(field: string, value: string): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(like(column, value));
    }
    return this;
  }

  ilike(field: string, value: string): this {
    const column = this.table[field];
    if (column) {
      this.conditions.push(ilike(column, value));
    }
    return this;
  }

  is(field: string, value: any): this {
    if (value === null) {
      const column = this.table[field];
      if (column) this.conditions.push(isNull(column));
    } else {
      this.eq(field, value);
    }
    return this;
  }

  not(field: string, value: any): this {
    if (value === null) {
      const column = this.table[field];
      if (column) this.conditions.push(isNotNull(column));
    } else {
      this.neq(field, value);
    }
    return this;
  }

  or(condition: string): this {
    // Simplified OR support - just add as additional condition
    // In a real implementation, this would parse the Supabase filter syntax
    return this;
  }

  order(field: string, options?: OrderOptions): this {
    this.orderByField = field;
    this.orderByDirection = options?.ascending === false ? "desc" : "asc";
    return this;
  }

  limit(cnt: number): this {
    this.limitCount = cnt;
    return this;
  }

  range(start: number, end: number): this {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  single(): this {
    this.singleMode = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle(): this {
    this.singleMode = true;
    this.limitCount = 1;
    return this;
  }

  insert(data: any | any[]): this {
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any): this {
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.deleteMode = true;
    return this;
  }

  // Support for .then() to make it PromiseLike
  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private buildWhereClause(): SQL | undefined {
    if (this.conditions.length === 0) return undefined;
    if (this.conditions.length === 1) return this.conditions[0];
    return and(...this.conditions);
  }

  async execute(): Promise<QueryResult<T>> {
    try {
      // INSERT
      if (this.insertData) {
        const result = await this.db.insert(this.table).values(this.insertData).returning();
        const data = this.singleMode ? result[0] || null : result;
        return { data: data as T, error: null };
      }

      // UPDATE
      if (this.updateData) {
        const where = this.buildWhereClause();
        const result = await this.db
          .update(this.table)
          .set(this.updateData)
          .where(where || sql`true`)
          .returning();
        const data = this.singleMode ? result[0] || null : result;
        return { data: data as T, error: null };
      }

      // DELETE
      if (this.deleteMode) {
        const where = this.buildWhereClause();
        await this.db.delete(this.table).where(where || sql`true`);
        return { data: null, error: null };
      }

      // SELECT
      const where = this.buildWhereClause();

      if (this.countMode) {
        const result = await this.db.select({ count: count() }).from(this.table).where(where || sql`true`);
        return { data: null as any, error: null, count: result[0]?.count || 0 };
      }

      let query: any = this.db.select().from(this.table);

      if (where) {
        query = query.where(where);
      }

      if (this.orderByField) {
        const column = this.table[this.orderByField];
        if (column) {
          const orderFn = this.orderByDirection === "desc" ? desc(column) : asc(column);
          query = query.orderBy(orderFn);
        }
      }

      if (this.limitCount) {
        query = query.limit(this.limitCount);
      }

      const result = await query;

      // 自动转换日期字段
      const convertDates = (obj: any): any => {
        if (!obj) return obj;
        if (Array.isArray(obj)) {
          return obj.map(convertDates);
        }
        if (typeof obj === 'object') {
          const converted: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && 
                (key.includes('_at') || key.includes('_time') || key === 'collected_at' || key === 'published_at' || key === 'scheduled_at' || key === 'sent_at' || key === 'last_collected_at')) {
              // 尝试将字符串转换为 Date
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                converted[key] = date;
              } else {
                converted[key] = value;
              }
            } else {
              converted[key] = value;
            }
          }
          return converted;
        }
        return obj;
      };

      const convertedResult = convertDates(result);

      // Handle range
      if (this.rangeStart !== null && this.rangeEnd !== null) {
        const sliced = convertedResult.slice(this.rangeStart, this.rangeEnd + 1);
        return { data: sliced as T[], error: null, count: convertedResult.length };
      }

      const data = this.singleMode ? convertedResult[0] || null : convertedResult;
      return { data: data as T, error: null, count: convertedResult.length };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || "Database error", code: error.code },
      };
    }
  }
}

// ==================== Supabase 兼容客户端 ====================

export class SupabaseCompatibleClient {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  from(tableName: string, options?: { count?: 'exact' | 'planned' | 'estimated' }): SupabaseQueryBuilder<any> {
    const tableMap: Record<string, any> = {
      stock_list: schema.stockList,
      comment_templates: schema.commentTemplates,
      publish_tasks: schema.publishTasks,
      stock_comments: schema.stockComments,
      alert_configs: schema.alertConfigs,
      alert_records: schema.alertRecords,
      auto_collect_configs: schema.autoCollectConfigs,
      sensitive_words: schema.sensitiveWords,
    };

    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    const queryBuilder = new SupabaseQueryBuilder(this.db, table, tableName);
    if (options?.count) {
      queryBuilder.countMode = options.count;
    }
    return queryBuilder;
  }

  async rpc(_functionName: string, _params?: any): Promise<QueryResult<any>> {
    // RPC not supported in self-built PostgreSQL mode
    return { data: null, error: { message: "RPC not supported" } };
  }
}

// ==================== 导出 ====================

let clientInstance: SupabaseCompatibleClient | null = null;

export function getSupabaseClient(): SupabaseCompatibleClient {
  if (clientInstance) return clientInstance;
  const db = getDb();
  clientInstance = new SupabaseCompatibleClient(db);
  return clientInstance;
}

export { schema };
