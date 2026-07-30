import { Injectable } from '@nestjs/common'
import { Pool, types } from 'pg'
import { queryConvert } from 'src/system/common/utils'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class MrmDatabaseService {
  private pool: Pool

  constructor(private readonly logger: LoggerService) {
    const NUMERIC_OID = 1700

    // Check for SSL connection
    const enableSSL = process.env.SSL_ENABLED === 'true'

    // Устанавливаем кастомный парсер для типа numeric
    types.setTypeParser(NUMERIC_OID, (val) => parseFloat(val))

    this.pool = new Pool({
      user: process.env.RM_PG_USER,
      host: process.env.RM_PG_HOST,
      database: process.env.RM_PG_SCHEMA,
      password: process.env.RM_PG_PASSWORD,
      port: process.env.RM_PG_PORT,
      ssl: enableSSL
        ? {
            rejectUnauthorized: false
          }
        : false
    })

    this.logger.sys('MRM Database Service initialized', {
      host: process.env.RM_PG_HOST,
      database: process.env.RM_PG_SCHEMA,
      ssl_enabled: enableSSL
    })
  }

  async query(sql: string, params: any = {}): Promise<any> {
    this.logger.info('Executing SQL query', 'ВыполнениеSQLЗапроса', {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params_count: Object.keys(params).length
    })

    try {
      const client = await this.pool.connect()
      const convertedQuery = queryConvert(sql, params)

      const result = await client.query(
        convertedQuery.text,
        convertedQuery.values
      )
      client.release()

      this.logger.info(
        'SQL query executed successfully',
        'SQLЗапросУспешноВыполнен',
        {
          row_count: result.rows.length
        }
      )

      return result.rows
    } catch (error) {
      this.logger.error(
        'Error executing SQL query',
        'ОшибкаВыполненияSQLЗапроса',
        error,
        {
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          params_count: Object.keys(params).length
        }
      )
      throw error
    }
  }

  async queryAll(
    sql: string,
    params: Record<string, any>[] = [{}]
  ): Promise<any> {
    this.logger.info(
      'Executing multiple SQL queries',
      'ВыполнениеНесколькихSQLЗапросов',
      {
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        queries_count: params.length
      }
    )

    try {
      const results = await Promise.all(
        params.map((arg) => this.query(sql, arg))
      )

      this.logger.info(
        'Multiple SQL queries executed successfully',
        'НесколькоЗапросовУспешноВыполнены',
        {
          total_results: results.reduce((acc, curr) => acc + curr.length, 0)
        }
      )

      return results
    } catch (error) {
      this.logger.error(
        'Error executing multiple SQL queries',
        'ОшибкаВыполненияНесколькихSQLЗапросов',
        error,
        {
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          queries_count: params.length
        }
      )
      throw error
    }
  }
}
