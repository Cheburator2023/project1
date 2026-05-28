import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'
import { PimUsageEntity } from './entities/pim-usage.entity'

type PimUsageModelKeyColumn = 'system_model_id' | 'model_id'

@Injectable()
export class PimUsageService {
  private pimUsageModelKeyColumnPromise: Promise<PimUsageModelKeyColumn> | null =
    null

  constructor(
    private readonly databaseService: MrmDatabaseService,
    private readonly logger: LoggerService
  ) {}

  /**
   * В старых стендах колонка называется `system_model_id`, после ряда миграций — `model_id`.
   * Ошибка 42703 «column … does not exist» возникает при рассинхроне кода и схемы.
   */
  private async resolvePimUsageModelKeyColumn(): Promise<PimUsageModelKeyColumn> {
    if (!this.pimUsageModelKeyColumnPromise) {
      this.pimUsageModelKeyColumnPromise = (async () => {
        const rows = await this.databaseService.query(
          `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_catalog = current_database()
            AND table_schema NOT IN ('pg_catalog', 'information_schema')
            AND table_name = 'models_pim_usage'
            AND column_name IN ('system_model_id', 'model_id')
          ORDER BY CASE column_name WHEN 'model_id' THEN 1 ELSE 2 END
          LIMIT 1
          `,
          {}
        )
        const name = (rows[0] as { column_name?: string } | undefined)
          ?.column_name
        if (name === 'model_id' || name === 'system_model_id') {
          return name
        }
        return 'system_model_id'
      })()
    }
    return this.pimUsageModelKeyColumnPromise
  }

  private mapRowToEntity(row: Record<string, unknown>): PimUsageEntity {
    const raw = row.system_model_id ?? row.model_id
    const system_model_id =
      raw !== undefined && raw !== null ? String(raw) : ''
    return {
      ...(row as PimUsageEntity),
      system_model_id
    }
  }

  async getPimUsageForModel(
    system_model_id: string,
    quarter: number,
    year: number
  ): Promise<PimUsageEntity | null> {
    this.logger.info(
      'Getting PIM usage for model',
      'ПолучениеДанныхПИМИспользования',
      { system_model_id, quarter, year }
    )

    try {
      const col = await this.resolvePimUsageModelKeyColumn()
      const [result] = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE ${col} = :system_model_id
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { system_model_id, quarter, year }
      )

      return result
        ? this.mapRowToEntity(result as Record<string, unknown>)
        : null
    } catch (error) {
      this.logger.error(
        'Error getting PIM usage',
        'ОшибкаПолученияДанныхПИМ',
        error,
        { system_model_id, quarter, year }
      )
      throw error
    }
  }

  async getPimUsageForModels(
    systemModelIds: string[],
    quarter: number,
    year: number
  ): Promise<PimUsageEntity[]> {
    this.logger.info(
      'Getting PIM usage for multiple models',
      'ПолучениеДанныхПИМДляМоделей',
      { count: systemModelIds.length, quarter, year }
    )

    try {
      const col = await this.resolvePimUsageModelKeyColumn()
      const results = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE ${col} = ANY(:system_model_ids)
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { system_model_ids: systemModelIds, quarter, year }
      )

      return (results as Record<string, unknown>[]).map((r) =>
        this.mapRowToEntity(r)
      )
    } catch (error) {
      this.logger.error(
        'Error getting PIM usage for models',
        'ОшибкаПолученияДанныхПИМДляМоделей',
        error,
        { count: systemModelIds.length, quarter, year }
      )
      throw error
    }
  }

  /**
   * Снимок таблицы для отладочной страницы seed (без фильтров).
   */
  async listAllPimUsageOrdered(): Promise<PimUsageEntity[]> {
    try {
      const rows = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        ORDER BY confirmation_year DESC,
          confirmation_quarter DESC,
          pim_usage_id DESC
        `,
        {}
      )
      return (rows as Record<string, unknown>[]).map((r) =>
        this.mapRowToEntity(r)
      )
    } catch (error) {
      this.logger.error(
        'Error listing models_pim_usage',
        'ОшибкаЧтенияТаблицыПИМ',
        error,
        {}
      )
      throw error
    }
  }

  async insertPimUsage(
    system_model_id: string,
    quarter: number,
    year: number,
    is_used: boolean
  ): Promise<PimUsageEntity | null> {
    this.logger.info(
      'Inserting PIM usage record',
      'ДобавлениеЗаписиПИМИспользования',
      { system_model_id, quarter, year, is_used }
    )

    try {
      const col = await this.resolvePimUsageModelKeyColumn()
      const [result] = await this.databaseService.query(
        `
        INSERT INTO models_pim_usage (${col}, confirmation_quarter, confirmation_year, is_used, source_system)
        VALUES (:system_model_id, :quarter, :year, :is_used, 'PIM')
        ON CONFLICT (${col}, confirmation_quarter, confirmation_year)
        DO UPDATE SET is_used = :is_used, update_date = NOW()
        RETURNING *
        `,
        { system_model_id, quarter, year, is_used }
      )

      this.logger.info(
        'PIM usage record inserted/updated',
        'ЗаписьПИМИспользованияДобавлена',
        { system_model_id, quarter, year, pim_usage_id: result?.pim_usage_id }
      )

      return result
        ? this.mapRowToEntity(result as Record<string, unknown>)
        : null
    } catch (error) {
      this.logger.error(
        'Error inserting PIM usage',
        'ОшибкаДобавленияДанныхПИМ',
        error,
        { system_model_id, quarter, year }
      )
      throw error
    }
  }
}
