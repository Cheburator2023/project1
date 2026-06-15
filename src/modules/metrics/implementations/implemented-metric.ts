import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class ImplementedMetric extends IndependentMetric<MetricResult> {
  private readonly implementedInPimStatus = 'Внедрена в ПИМ'
  private readonly archiveStatus = 'Архив'

  private filteredModels: any[] = []

  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const count = countFilteredModels.length

    // Новая delta логика по точным датам
    const delta = this.calculateDeltaByExactDates()

    this.filteredModels = countFilteredModels

    return {
      count,
      delta
    }
  }

  // Новый метод для расчета delta по временным диапазонам
  private calculateDeltaByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      this.startDate,
      this.endDate
    )

    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    )

    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    )

    const result = currentRangeModels.length - deltaRangeModels.length

    return result
  }

  // Отдельный метод для фильтрации по временным диапазонам (для delta)
  private filterModelsByDateRange(models, startDate: Date, endDate: Date) {
    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation
        ? new Date(model.date_of_introduction_into_operation)
        : null

      /**
       * Условие: Если "Дата релиза" модели входит в выбранный временной срез,
       * И модель соответствует критериям внедрения,
       * ТО модель попадает в категорию "Внедренные модели".
       * Дата релиза должна попадать в диапазон [startDate, endDate]
       */
      if (
        this.isWithinDateRange(releaseDate, startDate, endDate) &&
        this.hasImplementedInPimStatus(model)
      ) {
        return true
      }

      return false
    })
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      status: model.model_status,
      stage: model.model_stage,
      status_history: this.formatStatusHistory(model),
      date_of_introduction_into_operation:
        model.date_of_introduction_into_operation
    }))
  }

  public getFilteredDeltaRowData() {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      this.startDate,
      this.endDate
    )

    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    )

    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    )

    const result = []

    // Модели в текущем диапазоне
    result.push(
      ...currentRangeModels.map((model) => ({
        system_model_id: model.system_model_id,
        status: model.model_status,
        stage: model.model_stage,
        status_history: this.formatStatusHistory(model),
        date_of_introduction_into_operation:
          model.date_of_introduction_into_operation,
        period: 'current'
      }))
    )

    // Модели в delta диапазоне
    result.push(
      ...deltaRangeModels.map((model) => ({
        system_model_id: model.system_model_id,
        status: model.model_status,
        stage: model.model_stage,
        status_history: this.formatStatusHistory(model),
        date_of_introduction_into_operation:
          model.date_of_introduction_into_operation,
        period: 'past'
      }))
    )

    return result
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      startDate,
      endDate,
      null
    )

    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation
        ? new Date(model.date_of_introduction_into_operation)
        : null

      /**
       * 1. Условие: Если "Дата релиза" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Внедренные модели".
       */
      if (
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.hasImplementedInPimStatus(model)
      ) {
        return true
      }

      return false
    })
  }

  private hasImplementedInPimStatus(model): boolean {
    const currentStatus = typeof model.model_status === 'string'
      ? model.model_status.trim()
      : ''

    if (currentStatus === this.implementedInPimStatus) {
      return true
    }

    if (currentStatus !== this.archiveStatus) {
      return false
    }

    return this.getStatusHistory(model).some(
      (historyItem) => this.getStatusHistoryName(historyItem) === this.implementedInPimStatus
    )
  }

  private getStatusHistory(model): any[] {
    const history = model.model_status_history ?? model.status_history

    if (Array.isArray(history)) {
      return history
    }

    if (typeof history !== 'string') {
      return []
    }

    try {
      const parsed = JSON.parse(history)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private getStatusHistoryName(historyItem): string {
    return historyItem?.status ?? historyItem?.status_name ?? ''
  }

  private formatStatusHistory(model): string {
    return this.getStatusHistory(model)
      .map((historyItem) => {
        const status = this.getStatusHistoryName(historyItem)
        const effectiveFrom = historyItem?.effective_from ?? ''

        return effectiveFrom ? `${status} (${effectiveFrom})` : status
      })
      .filter(Boolean)
      .join('; ')
  }
}
