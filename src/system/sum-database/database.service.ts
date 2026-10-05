import { Injectable } from '@nestjs/common'
import { Pool, PoolClient, types } from 'pg'
import { queryConvert } from 'src/system/common/utils'
import { buildPostgresTlsConfig } from 'src/system/common/tls-config'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class SumDatabaseService {
  private pool: Pool

  constructor(private readonly logger: LoggerService) {
    const NUMERIC_OID = 1700

    // Единая логика TLS для всех подключений к PostgreSQL.
    const tlsConfig = buildPostgresTlsConfig()

    // Устанавливаем кастомный парсер для типа numeric
    types.setTypeParser(NUMERIC_OID, (val) => parseFloat(val))

    this.pool = new Pool({
      user: process.env.SUM_PG_USER,
      host: process.env.SUM_PG_HOST,
      database: process.env.SUM_PG_SCHEMA,
      password: process.env.SUM_PG_PASSWORD,
      port: process.env.SUM_PG_PORT,
      ssl: tlsConfig.ssl
    })

    this.logger.sys('SUM Database Service initialized', {
      host: process.env.SUM_PG_HOST,
      database: process.env.SUM_PG_SCHEMA,
      tls_enabled: tlsConfig.enabled,
      tls_unauthorized: tlsConfig.ssl,
      tls_ca_loaded: tlsConfig.source.caLoaded,
      tls_client_cert_loaded: tlsConfig.source.clientCertLoaded,
      tls_client_key_loaded: tlsConfig.source.clientKeyLoaded
    })
  }

  async withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()

    try {
      return await handler(client)
    } finally {
      client.release()
    }
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
