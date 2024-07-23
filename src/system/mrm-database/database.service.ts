import { Injectable, Logger } from "@nestjs/common";
import { Pool, Client } from "pg";
import { queryConvert } from "src/system/common/utils";

@Injectable()
export class MrmDatabaseService {
  private readonly logger = new Logger(MrmDatabaseService.name);
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.RM_PG_USER,
      host: process.env.RM_PG_HOST,
      database: process.env.RM_PG_SCHEMA,
      password: process.env.RM_PG_PASSWORD,
      port: 5432
    })
  }

  async query(sql: string, params: any): Promise<any> {
    try {
      const client = await this.pool.connect();
      const result = await client.query(queryConvert(sql, params));
      client.release();

      return result.rows;
    } catch (error) {
      this.logger.error(`Error executing SQL query: ${error}`)
      throw error
    }
  }

  async queryAll(sql: string, params: Object[]): Promise<any> {
    return Promise.all(
      params.map(arg => this.query(sql, arg))
    )
  }
}
