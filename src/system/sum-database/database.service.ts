import { Injectable, Logger } from '@nestjs/common';
import { Pool, types } from 'pg';
import { queryConvert } from 'src/system/common/utils';

@Injectable()
export class SumDatabaseService {
  private readonly logger = new Logger(SumDatabaseService.name);
  private pool: Pool;

  constructor() {
    // Описание типа данных numeric в PostgreSQL
    const NUMERIC_OID = 1700;

    // Устанавливаем кастомный парсер для типа numeric
    types.setTypeParser(NUMERIC_OID, (val) => parseFloat(val));

    this.pool = new Pool({
      user: process.env.SUM_PG_USER,
      host: process.env.SUM_PG_HOST,
      database: process.env.SUM_PG_SCHEMA,
      password: process.env.SUM_PG_PASSWORD,
      port: process.env.SUM_PG_PORT
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
