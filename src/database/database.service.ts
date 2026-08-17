import databaseConfig from "../config/database.config";
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * Service managing PostgreSQL connection pooling, health initialization checks, raw SQL queries, and transaction management.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(
    @Inject(databaseConfig.KEY)
    private dbConfig: ConfigType<typeof databaseConfig>,
  ) {
    this.pool = new Pool({
      connectionString: this.dbConfig.uri,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }

  /**
   * Lifecycle hook establishing connection and verifying database connectivity on module initialization.
   */
  async onModuleInit() {
    const client = await this.pool.connect();

    try {
      await client.query("SELECT NOW()");
      console.log("Database connected");
    } finally {
      client.release();
    }
  }

  /**
   * Lifecycle hook closing PostgreSQL connection pool gracefully on module teardown.
   */
  async onModuleDestroy() {
    await this.pool.end();
  }

  /**
   * Executes a SQL query against the connection pool.
   *
   * @template T - Expected QueryResultRow type.
   * @param text - SQL query string.
   * @param params - Parameterized query argument array.
   * @returns Promise resolving to pg QueryResult<T>.
   */
  query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Executes a callback within a managed PostgreSQL database transaction (`BEGIN`, `COMMIT`, `ROLLBACK`).
   *
   * @template T - Return type of transaction callback.
   * @param callback - Transaction execution callback receiving dedicated PoolClient.
   * @returns Promise resolving to callback return value.
   * @throws Propagates any error occurring during transaction execution.
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await callback(client);

      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
