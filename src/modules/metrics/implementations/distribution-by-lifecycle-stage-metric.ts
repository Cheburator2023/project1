import { IndependentMetric } from '../base'
import { DistributionByLifecycleStageModelsMetricResult } from '../interfaces'
import { parseDate } from 'src/system/common/utils'

export class DistributionByLifecycleStageMetric extends IndependentMetric<DistributionByLifecycleStageModelsMetricResult> {
  private filteredModels: any[] = []
  private lifecycleStages: Map<string, number>
  private readonly implementedInPimStatuses = new Set([
    'Модель была внедрена в ПИМ (старая модель)',
    'Модель внедряется в ПИМ',
    'Разработана, внедрена в ПИМ',
    'Внедрена в ПИМ'
  ])
  private readonly implementedOutsidePimStatuses = new Set([
    'Модель внедряется вне ПИМ',
    'Разработана, внедрена вне ПИМ',
    'Внедрена вне ПИМ'
  ])
  private readonly developedNotImplementedStatuses = new Set([
    'Разработана, не внедрена'
  ])

  calculate(): DistributionByLifecycleStageModelsMetricResult {
    this.filteredModels = []
    this.lifecycleStages = new Map<string, number>()
    const filteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    filteredModels.forEach((model) => {
      const segments = this.getSegments(model.model_stage, model.model_status)

      if (!segments.length) {
        return
      }

      segments.forEach((segment) => {
        this.countStage(model, segment)
      })
    })

    return Array.from(
      this.lifecycleStages.entries()
    ) as DistributionByLifecycleStageModelsMetricResult
  }

  private countStage(model, stage) {
    this.filteredModels.push({ ...model, calculated_status: stage })

    if (this.lifecycleStages.has(stage)) {
      this.lifecycleStages.set(stage, this.lifecycleStages.get(stage)! + 1)
    } else {
      this.lifecycleStages.set(stage, 1)
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      status: model.model_status,
      stage: model.model_stage,
      normalized_stage: model.calculated_status
    }))
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      startDate,
      endDate
    )

    return models.filter((model) => {
      const createDate = this.parseModelDate(model.create_date)
      const releaseDate = this.parseModelDate(
        model.date_of_introduction_into_operation
      )
      const devEndDate = this.parseModelDate(model.developing_end_date)
      const pilotEndDate = this.parseModelDate(model.data_completion_of_stage_05a)

      if (
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(devEndDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      if (
        releaseDate === null &&
        devEndDate === null &&
        pilotEndDate === null &&
        this.isWithinDateRange(createDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }

  private getSegments(
    stageValue: string | null | undefined,
    statusValue: string | null | undefined
  ): string[] {
    const segments = new Set<string>()

    this.getStages(stageValue).forEach((stage) => segments.add(stage))

    const normalizedStatus = this.normalizeStatus(statusValue)
    if (normalizedStatus) {
      segments.add(normalizedStatus)
    }

    return Array.from(segments)
  }

  private getStages(stageValue: string | null | undefined): string[] {
    if (typeof stageValue !== 'string') {
      return []
    }

    return stageValue
      .split(';')
      .map((stage) => stage.trim())
      .filter(Boolean)
  }

  private normalizeStatus(statusValue: string | null | undefined): string | null {
    if (typeof statusValue !== 'string') {
      return null
    }

    const statuses = statusValue
      .split(';')
      .map((status) => status.trim())
      .filter(Boolean)

    for (const status of statuses) {
      if (this.implementedInPimStatuses.has(status)) {
        return 'Внедрена в ПИМ'
      }

      if (this.implementedOutsidePimStatuses.has(status)) {
        return 'Внедрена вне ПИМ'
      }

      if (this.developedNotImplementedStatuses.has(status)) {
        return 'Разработана, не внедрена'
      }
    }

    return null
  }

  private parseModelDate(value: string | Date | null | undefined): Date | null {
    if (value == null) {
      return null
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null
    }

    return parseDate(value)
  }
}
