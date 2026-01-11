/**
 * PostgreSQL Provider Adapter
 * 
 * Connects to PostgreSQL databases, lists tables, queries data, and executes SQL.
 */

import type {
  ApiKeyCredentials,
  Credentials,
  ExecutionContext,
  OperationId,
} from "../types";
import { BaseProviderAdapter } from "./base";
import { createError } from "../rate-limit";
import postgres from "postgres";

// ============================================================================
// PostgreSQL Provider Adapter
// ============================================================================

export type PostgresOperation =
  | "postgres.listTables"
  | "postgres.getRows"
  | "postgres.query"
  | "postgres.insert"
  | "postgres.update"
  | "postgres.delete";

export class PostgresAdapter extends BaseProviderAdapter {
  readonly providerId = "postgres" as const;
  readonly supportedOperations: OperationId[] = [
    "postgres.listTables" as OperationId,
    "postgres.getRows" as OperationId,
    "postgres.query" as OperationId,
    "postgres.insert" as OperationId,
    "postgres.update" as OperationId,
    "postgres.delete" as OperationId,
  ];
  
  protected async executeOperation(
    operation: OperationId,
    input: Record<string, unknown>,
    credentials: Credentials,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    const connectionString = this.getConnectionString(input, credentials);
    
    // Create a connection
    const sql = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      connection: {
        application_name: "zynthex",
      },
      max: 1, // Single connection for one-off queries
      idle_timeout: 20,
      connect_timeout: 30,
    });
    
    try {
      let result: Record<string, unknown>;
      
      switch (operation as PostgresOperation) {
        case "postgres.listTables":
          result = await this.listTables(sql, input);
          break;
        case "postgres.getRows":
          result = await this.getRows(sql, input);
          break;
        case "postgres.query":
          result = await this.executeQuery(sql, input);
          break;
        case "postgres.insert":
          result = await this.insertRow(sql, input);
          break;
        case "postgres.update":
          result = await this.updateRows(sql, input);
          break;
        case "postgres.delete":
          result = await this.deleteRows(sql, input);
          break;
        default:
          throw createError("UNSUPPORTED_OPERATION", `Unknown operation: ${operation}`);
      }
      
      // Close connection after we have the result
      await sql.end();
      
      return result;
    } catch (error) {
      // Make sure to close on error too
      await sql.end().catch(() => {});
      throw error;
    }
  }
  
  /**
   * Get connection string from input or credentials
   */
  private getConnectionString(input: Record<string, unknown>, credentials: Credentials): string {
    // First check input for connection string
    if (input.connectionString && typeof input.connectionString === "string") {
      return input.connectionString;
    }
    
    // Then check credentials
    if (credentials?.type === "api_key") {
      return (credentials as ApiKeyCredentials).apiKey;
    }
    
    // Check for individual connection params
    if (input.host && input.database) {
      const host = input.host as string;
      const port = (input.port as number) || 5432;
      const database = input.database as string;
      const user = input.user as string || "postgres";
      const password = input.password as string || "";
      
      return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    }
    
    throw createError("INVALID_CREDENTIALS", "PostgreSQL connection string or connection details required");
  }
  
  // ============================================================================
  // Database Operations
  // ============================================================================
  
  /**
   * List all tables in the database
   */
  private async listTables(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const schema = (input.schema as string) || "public";
    
    const tables = await sql`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables 
      WHERE table_schema = ${schema}
      ORDER BY table_name
    `;
    
    // Get row counts for each table
    const tableDetails = await Promise.all(
      tables.map(async (table) => {
        try {
          const countResult = await sql.unsafe(
            `SELECT COUNT(*) as count FROM "${schema}"."${table.table_name}"`
          );
          return {
            name: table.table_name,
            type: table.table_type,
            rowCount: parseInt(countResult[0]?.count || "0", 10),
          };
        } catch {
          return {
            name: table.table_name,
            type: table.table_type,
            rowCount: null,
          };
        }
      })
    );
    
    return {
      schema,
      tables: tableDetails,
      count: tableDetails.length,
    };
  }
  
  /**
   * Get rows from a table
   */
  private async getRows(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const table = input.table as string;
    const schema = (input.schema as string) || "public";
    const limit = (input.limit as number) || 100;
    const offset = (input.offset as number) || 0;
    const orderBy = input.orderBy as string;
    const orderDirection = (input.orderDirection as string) || "ASC";
    const where = input.where as string;
    
    if (!table) {
      throw createError("VALIDATION_ERROR", "Table name is required");
    }
    
    // Build query safely
    let query = `SELECT * FROM "${schema}"."${table}"`;
    
    if (where) {
      query += ` WHERE ${where}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY "${orderBy}" ${orderDirection === "DESC" ? "DESC" : "ASC"}`;
    }
    
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const rows = await sql.unsafe(query);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM "${schema}"."${table}"`;
    if (where) {
      countQuery += ` WHERE ${where}`;
    }
    const countResult = await sql.unsafe(countQuery);
    const totalCount = parseInt(countResult[0]?.total || "0", 10);
    
    // Get column info
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = ${schema} AND table_name = ${table}
      ORDER BY ordinal_position
    `;
    
    return {
      table,
      schema,
      rows,
      columns: columns.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      })),
      count: rows.length,
      totalCount,
      limit,
      offset,
    };
  }
  
  /**
   * Execute a custom SQL query
   */
  private async executeQuery(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const query = input.query as string;
    
    if (!query) {
      throw createError("VALIDATION_ERROR", "SQL query is required");
    }
    
    // Execute query
    const result = await sql.unsafe(query);
    
    return {
      rows: result,
      count: result.length,
      query,
    };
  }
  
  /**
   * Insert a row into a table
   */
  private async insertRow(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const table = input.table as string;
    const schema = (input.schema as string) || "public";
    const data = input.data as Record<string, unknown>;
    
    if (!table || !data) {
      throw createError("VALIDATION_ERROR", "Table name and data are required");
    }
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const columnList = columns.map(c => `"${c}"`).join(", ");
    
    const query = `INSERT INTO "${schema}"."${table}" (${columnList}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await sql.unsafe(query, values);
    
    return {
      inserted: result[0] || null,
      table,
      success: true,
    };
  }
  
  /**
   * Update rows in a table
   */
  private async updateRows(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const table = input.table as string;
    const schema = (input.schema as string) || "public";
    const data = input.data as Record<string, unknown>;
    const where = input.where as string;
    
    if (!table || !data || !where) {
      throw createError("VALIDATION_ERROR", "Table name, data, and WHERE clause are required");
    }
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(", ");
    
    const query = `UPDATE "${schema}"."${table}" SET ${setClause} WHERE ${where} RETURNING *`;
    
    const result = await sql.unsafe(query, values);
    
    return {
      updated: result,
      count: result.length,
      table,
      success: true,
    };
  }
  
  /**
   * Delete rows from a table
   */
  private async deleteRows(
    sql: postgres.Sql,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const table = input.table as string;
    const schema = (input.schema as string) || "public";
    const where = input.where as string;
    
    if (!table || !where) {
      throw createError("VALIDATION_ERROR", "Table name and WHERE clause are required");
    }
    
    const query = `DELETE FROM "${schema}"."${table}" WHERE ${where} RETURNING *`;
    
    const result = await sql.unsafe(query);
    
    return {
      deleted: result,
      count: result.length,
      table,
      success: true,
    };
  }
}

// Export singleton instance
export const postgresAdapter = new PostgresAdapter();


