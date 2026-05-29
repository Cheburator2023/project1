import { IndependentMetric } from '../base'
import { IFinalStatusMetric, MetricResult } from '../interfaces'

export class FinalStatusMetric<T extends MetricResult>
  extends IndependentMetric<T>
  implements IFinalStatusMetric<T>
{
  private readonly finalStatusNames = [
    'Внедрена вне ПИМ',
    'Разработана, не внедрена',
    'Внедрена в ПИМ',
    'Архив'
  ]

  private filteredModels: any[] = []
  private deltaFilteredModels: any[] = []

  calculate() {
    this.filteredModels = []
    this.deltaFilteredModels = []

    this.filteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    // delta
    this.filterModels(this.models, this.startDate, this.endDate, true)

    const count = this.filteredModels.length
    const delta =
      this.deltaFilteredModels.filter((model) => model.period === 'current')
        .length -
      this.deltaFilteredModels.filter((model) => model.period === 'past').length

    return {
      count,
      delta
    } as T
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      model_status: model.model_status,
      model_stage: model.model_stage,
      date_of_introduction_into_operation:
        model.date_of_introduction_into_operation,
      developing_end_date: model.developing_end_date,
      data_completion_of_stage_05a: model.data_completion_of_stage_05a,
      status_history: this.formatStatusHistory(model)
    }))
  }

  public getFilteredDeltaRowData() {
    return this.deltaFilteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      model_status: model.model_status,
      model_stage: model.model_stage,
      status_history: this.formatStatusHistory(model),
      filtered_date: model.relevantDate,
      history_status_date: model.historyStatusDate,
      period: model.period
    }))
  }

  filterModels<T extends boolean>(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation = false,
    returnDate?: T
  ): T extends true ? { model: any; date: Date }[] : any[] {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      startDate,
      endDate
    )

    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      startDate,
      endDate,
      isDeltaCalculation ? 7 : null
    )

    return models
      .map((model) => {
        // Для расчёта приростов
        // Если у модели по новой логике в истории изменения статуса содержится одно из значений:
        // 'Внедрена вне ПИМ', 'Разработана, не внедрена', 'Внедрена в ПИМ',
        // и дата изменения effective_from попадает во временной срез
        const statusHistory = this.getStatusHistory(model)

        // При этом, если у модели есть только одна запись в истории статусов, и статус = "Архив", то расчёт производим по старой логике (по артефактам)
        if (
          isDeltaCalculation &&
          statusHistory.length &&
          !(
            statusHistory.length === 1 &&
            this.getStatusHistoryName(statusHistory[0]) === 'Архив'
          )
        ) {
          // выбираем только финальные статусы и сортируем от самого позднему к самому раннему
          const finalStatuses = statusHistory
            .filter((historyItem) => {
              return this.finalStatusNames.includes(
                this.getStatusHistoryName(historyItem)
              )
            })
            .sort(
              (a, b) =>
                new Date(b.effective_from).getTime() -
                new Date(a.effective_from).getTime()
            )

          // Аналогично - сатус "Архив" для моделей, которые сразу переходят в него, минуя другие финальные статусы
          const archiveStatuses = statusHistory
            .filter((historyItem) => {
              return 'Архив' === this.getStatusHistoryName(historyItem)
            })
            .sort(
              (a, b) =>
                new Date(b.effective_from).getTime() -
                new Date(a.effective_from).getTime()
            )

          if (finalStatuses.length || archiveStatuses.length) {
            // берём только самый последний финальный статус
            const lastFinalStatus = finalStatuses.length
              ? finalStatuses[0]
              : archiveStatuses[0]
            const effectiveFrom = new Date(lastFinalStatus.effective_from)

            if (
              this.isWithinDateRange(
                effectiveFrom,
                actualStartDate,
                currentRange.actualEndDate
              )
            ) {
              this.deltaFilteredModels.push({
                ...model,
                historyStatusDate: effectiveFrom,
                period: 'current'
              })
            }

            if (
              this.isWithinDateRange(
                effectiveFrom,
                actualStartDate,
                deltaRange.actualEndDate
              )
            ) {
              this.deltaFilteredModels.push({
                ...model,
                historyStatusDate: effectiveFrom,
                period: 'past'
              })
            }
            return returnDate ? { model, date: effectiveFrom } : model
          }
          return null
        }

        // const decomissDate = model.rs_model_decommiss_date ? new Date(model.rs_model_decommiss_date) : null
        const releaseDate = model.date_of_introduction_into_operation
          ? new Date(model.date_of_introduction_into_operation)
          : null
        const developingEndDate = model.developing_end_date
          ? new Date(model.developing_end_date)
          : null
        const pilotEndDate = model.data_completion_of_stage_05a
          ? new Date(model.data_completion_of_stage_05a)
          : null
        // const createDate = model.create_date ? new Date(model.create_date) : null
        /**
         * 1. Условие: Если "Дата выведения РС/Модели из эксплуатации" входит в выбранный временной срез,
         *    ИЛИ "Дата релиза" модели входит в выбранный временной срез,
         *    ИЛИ "Дата окончания разработки Модели" входит в выбранный временной срез,
         *    ИЛИ "Дата завершения разработки пилота" модели входит в выбранный временной срез,
         *    ИЛИ "Дата создания" модели входит в выбранный временной срез,
         *    ТО модель попадает в категорию "Модели с финальным статусом".
         */
        const modelDates = [
          // decomissDate,
          releaseDate,
          developingEndDate,
          pilotEndDate
          // createDate
        ]
        const relevantDate = modelDates.find((date) =>
          this.isWithinDateRange(date, actualStartDate, actualEndDate)
        )
        const relevantCurrentDate = modelDates.find((date) =>
          this.isWithinDateRange(
            date,
            actualStartDate,
            currentRange.actualEndDate
          )
        )
        const relevantDeltaDate = modelDates.find((date) =>
          this.isWithinDateRange(
            date,
            actualStartDate,
            deltaRange.actualEndDate
          )
        )

        /**
         * 2. Условие: Если "Статус модели" равен одному из финальных значений
         *    ТО модель попадает в категорию "Модели с финальным статусом".
         */
        const hasFinalStatus = this.hasFinalStatus(model)

        if (isDeltaCalculation && hasFinalStatus) {
          if (relevantCurrentDate) {
            this.deltaFilteredModels.push({
              ...model,
              relevantDate: relevantCurrentDate,
              period: 'current'
            })
          }
          if (relevantDeltaDate) {
            this.deltaFilteredModels.push({
              ...model,
              relevantDate: relevantDeltaDate,
              period: 'past'
            })
          }
        }

        if (relevantDate && hasFinalStatus) {
          return returnDate ? { model, date: relevantDate } : model
        }

        return null
      })
      .filter(Boolean)
  }

  private hasFinalStatus(model): boolean {
    if (typeof model.model_status !== 'string') {
      return false
    }

    return model.model_status
      .split(';')
      .map((status) => status.trim())
      .some((status) => this.finalStatusNames.includes(status))
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
