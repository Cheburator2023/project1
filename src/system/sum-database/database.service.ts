import { Injectable, Logger } from '@nestjs/common';
import { Pool, Client } from 'pg';
import { queryConvert } from 'src/system/common/utils';

@Injectable()
export class SumDatabaseService {
  private readonly logger = new Logger(SumDatabaseService.name);
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.SUM_PG_USER,
      host: process.env.SUM_PG_HOST,
      database: process.env.SUM_PG_SCHEMA,
      password: process.env.SUM_PG_PASSWORD,
      port: process.env.RM_PG_PORT
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
}
