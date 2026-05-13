import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'
import { PimUsageEntity } from './entities/pim-usage.entity'

@Injectable()
export class PimUsageService {
  constructor(
    private readonly databaseService: MrmDatabaseService,
    private readonly logger: LoggerService
  ) {}

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
      const [result] = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE system_model_id = :system_model_id
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { system_model_id, quarter, year }
      )

      return result || null
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
      const results = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE system_model_id = ANY(:system_model_ids)
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { system_model_ids: systemModelIds, quarter, year }
      )

      return results
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
      const [result] = await this.databaseService.query(
        `
        INSERT INTO models_pim_usage (system_model_id, confirmation_quarter, confirmation_year, is_used, source_system)
        VALUES (:system_model_id, :quarter, :year, :is_used, 'PIM')
        ON CONFLICT (system_model_id, confirmation_quarter, confirmation_year)
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

      return result || null
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
