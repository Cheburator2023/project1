import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { UsageServiceFactory } from './factories'
import {
  UpdateUsageDto,
  UpdateUsageOptions,
  UpdateUsageResult,
  UpdateUsageSourceResult
} from './dto'
import { canEditQuarter, MODEL_SOURCES } from 'src/system/common'
import { ModelServiceFactory } from 'src/modules/models/factories'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'

@Injectable()
export class UsageService {
  constructor(
    private readonly usageServiceFactory: UsageServiceFactory,
    private readonly modelsServiceFactory: ModelServiceFactory,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => ModelsCacheService))
    private readonly modelsCacheService: ModelsCacheService
  ) {}

  async updateUsage(
    data,
    source: MODEL_SOURCES,
    options: UpdateUsageOptions = {}
  ): Promise<UpdateUsageResult> {
    const transformedArtefacts = this.transformArtefacts(data)
    const sourceResults: Record<MODEL_SOURCES, UpdateUsageSourceResult> = {
      [MODEL_SOURCES.MRM]: this.createSourceResult(MODEL_SOURCES.MRM),
      [MODEL_SOURCES.SUM]: this.createSourceResult(MODEL_SOURCES.SUM)
    }

    sourceResults[source] = await this.handleUsageUpdateForSource(
      transformedArtefacts,
      source
    )

    if (options.syncLinkedSum && source === MODEL_SOURCES.MRM) {
      try {
        const sumModelIds = await this.resolveLinkedSumModelIds(
          transformedArtefacts.map((artefact) => artefact.model_id)
        )
        const sumArtefacts = transformedArtefacts.filter((artefact) =>
          sumModelIds.has(artefact.model_id)
        )
        sourceResults[MODEL_SOURCES.SUM] = await this.handleUsageUpdateForSource(
          sumArtefacts,
          MODEL_SOURCES.SUM
        )
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        this.logger.error(
          'Failed to prepare linked SUM usage sync',
          'ОшибкаПодготовкиСинхронизацииUsageВСУМ',
          error,
          {
            artefactsCount: transformedArtefacts.length
          }
        )
        sourceResults[MODEL_SOURCES.SUM] = {
          source: MODEL_SOURCES.SUM,
          attempted: true,
          updated: false,
          error: errMsg
        }
      }
    }

    return {
      hasUpdates: Object.values(sourceResults).some((result) => result.updated),
      sources: sourceResults
    }
  }

  private getCurrentDate(): Date {
    return new Date()
  }

  private determineYear(quarter: number, currentDate: Date): number {
    const currentYear = currentDate.getFullYear()

    // Проверяем переход года
    if (quarter === 4 && canEditQuarter(4, currentYear - 1)) {
      return currentYear - 1
    }

    return currentYear
  }

  private formatDate(date: string): string {
    const [day, month, year] = date.split('.')
    return `${year}-${month}-${day}`
  }

  transformArtefacts(
    artefacts: {
      model_id: string
      artefact_tech_label: string
      artefact_string_value: string
      artefact_value_id: null
      creator: string
    }[]
  ) {
    const currentDate = this.getCurrentDate()
    const result: Record<string, UpdateUsageDto> = {}
    const parsedArtefacts = artefacts
      .map((artefact) => {
        const match = artefact.artefact_tech_label.match(
          /usage_confirm_(date|flag)_q(\d)/
        )
        if (!match) return null

        const [, type, quarterStr] = match
        return {
          ...artefact,
          type,
          confirmation_quarter: parseInt(quarterStr, 10)
        }
      })
      .filter(
        (
          artefact
        ): artefact is {
          model_id: string
          artefact_tech_label: string
          artefact_string_value: string
          artefact_value_id: null
          creator: string
          type: string
          confirmation_quarter: number
        } => artefact !== null
      )
    const dateYearByModelQuarter = new Map<string, number>()

    parsedArtefacts.forEach((artefact) => {
      if (artefact.type !== 'date' || !artefact.artefact_string_value) return

      const formattedDate = this.formatDate(artefact.artefact_string_value)
      const date = new Date(formattedDate)
      if (Number.isNaN(date.getTime())) return

      dateYearByModelQuarter.set(
        `${artefact.model_id}:Q${artefact.confirmation_quarter}`,
        date.getFullYear()
      )
    })

    parsedArtefacts.forEach(
      ({ model_id, artefact_string_value, creator, type, confirmation_quarter }) => {
        const confirmation_year =
          dateYearByModelQuarter.get(`${model_id}:Q${confirmation_quarter}`) ??
          this.determineYear(confirmation_quarter, currentDate)
        const key = `${model_id}:${confirmation_year}-Q${confirmation_quarter}`

        if (!result[key]) {
          result[key] = {
            model_id,
            confirmation_year,
            confirmation_quarter,
            confirmation_date: null,
            is_used: null,
            creator
          }
        }

        if (type === 'date') {
          result[key].confirmation_date = this.formatDate(artefact_string_value)
        } else if (type === 'flag') {
          result[key].is_used = artefact_string_value.toLowerCase() === 'да'
        }
      }
    )

    return Object.values(result)
  }

  private createSourceResult(
    source: MODEL_SOURCES
  ): UpdateUsageSourceResult {
    return {
      source,
      attempted: false,
      updated: false,
      error: null
    }
  }

  private async handleUsageUpdateForSource(
    transformedArtefacts: UpdateUsageDto[],
    source: MODEL_SOURCES
  ): Promise<UpdateUsageSourceResult> {
    if (transformedArtefacts.length === 0) {
      return this.createSourceResult(source)
    }

    const usageService = this.usageServiceFactory.getService(source)

    try {
      const results = await Promise.all(
        transformedArtefacts.map((artefact) =>
          usageService.handleUpdateUsage(artefact)
        )
      )
      const hasUpdates = results.some((result) => result === true)

      if (hasUpdates) {
        await this.updateModelsUpdateDate(
          source,
          transformedArtefacts.map((artefact) => artefact.model_id)
        )

        // Force cache update to ensure fresh data is available immediately
        // await this.modelsCacheService.forceUpdateCache()
      }

      return {
        source,
        attempted: true,
        updated: hasUpdates,
        error: null
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      this.logger.error(
        'Usage update failed for source',
        'ОшибкаОбновленияUsageПоИсточнику',
        error,
        {
          source,
          artefactsCount: transformedArtefacts.length
        }
      )

      return {
        source,
        attempted: true,
        updated: false,
        error: errMsg
      }
    }
  }

  private async updateModelsUpdateDate(
    source: MODEL_SOURCES,
    modelIds: string[]
  ): Promise<void> {
    const uniqueModelIds = [...new Set(modelIds)]
    const modelService = this.modelsServiceFactory.getService(source)

    await Promise.all(
      uniqueModelIds.map((model_id) =>
        modelService.updateUpdateDate({
          model_id
        })
      )
    )
  }

  private async resolveLinkedSumModelIds(
    modelIds: string[]
  ): Promise<Set<string>> {
    const uniqueModelIds = [...new Set(modelIds)]
    if (uniqueModelIds.length === 0) {
      return new Set()
    }

    const sumModels: { model_id: string }[] = await this.sumDatabaseService.query(
      `
        SELECT model_id
        FROM models
        WHERE model_id::text = ANY(:model_ids)
      `,
      { model_ids: uniqueModelIds }
    )

    return new Set(sumModels.map((model) => String(model.model_id)))
  }
}
