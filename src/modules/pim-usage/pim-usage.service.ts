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
    model_id: string,
    quarter: number,
    year: number
  ): Promise<PimUsageEntity | null> {
    this.logger.info(
      'Getting PIM usage for model',
      'ПолучениеДанныхПИМИспользования',
      { model_id, quarter, year }
    )

    try {
      const [result] = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE model_id = :model_id
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { model_id, quarter, year }
      )

      return result || null
    } catch (error) {
      this.logger.error(
        'Error getting PIM usage',
        'ОшибкаПолученияДанныхПИМ',
        error,
        { model_id, quarter, year }
      )
      throw error
    }
  }

  async getPimUsageForModels(
    modelIds: string[],
    quarter: number,
    year: number
  ): Promise<PimUsageEntity[]> {
    this.logger.info(
      'Getting PIM usage for multiple models',
      'ПолучениеДанныхПИМДляМоделей',
      { count: modelIds.length, quarter, year }
    )

    try {
      const results = await this.databaseService.query(
        `
        SELECT *
        FROM models_pim_usage
        WHERE model_id = ANY(:model_ids)
          AND confirmation_quarter = :quarter
          AND confirmation_year = :year
        `,
        { model_ids: modelIds, quarter, year }
      )

      return results
    } catch (error) {
      this.logger.error(
        'Error getting PIM usage for models',
        'ОшибкаПолученияДанныхПИМДляМоделей',
        error,
        { count: modelIds.length, quarter, year }
      )
      throw error
    }
  }
}
