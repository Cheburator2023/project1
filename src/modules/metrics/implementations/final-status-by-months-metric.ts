import { IndependentMetric } from '../base'
import { BaseMetricResult, FinalStatusByMonthModelsMetricResult, IFinalStatusMetric } from '../interfaces'
import { FinalStatusMetric } from './final-status-metric'
import { MetricsEnum } from '../enums'

export class FinalStatusByMonthsMetric extends IndependentMetric<FinalStatusByMonthModelsMetricResult> {
  private finalStatusMetric: IFinalStatusMetric<BaseMetricResult>

  /**
   * Overrides the base getActualDateRange method.
   * If startDate and endDate are not provided, defaults to the beginning of the current year
   * and the last day of the current month.
   * If they are provided, calls the base method.
   */
  getActualDateRange(
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ): { actualStartDate: Date; actualEndDate: Date } {
    if (!startDate && !endDate) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // Default to the start of the current year
      const defaultStartDate = new Date(year, 0, 1) // January 1st
      // Default to the last day of the current month
      const defaultEndDate = new Date(year, month + 1, 0) // Last day of the current month

      return {
        actualStartDate: defaultStartDate,
        actualEndDate: defaultEndDate
      }
    }

    // Call the base method if startDate and/or endDate are provided
    return super.getActualDateRange(startDate, endDate, isDeltaCalculation)
  }

  calculate(): FinalStatusByMonthModelsMetricResult {
    this.finalStatusMetric = new FinalStatusMetric(MetricsEnum.FinalStatusModelsMetric)
    this.finalStatusMetric.initialize(
      this.models,
      this.startDate,
      this.endDate
    )

    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate,
      false
    )

    const filteredModelsWithDates = this.finalStatusMetric.filterModels(
      this.models,
      this.startDate,
      this.endDate,
      false,
      true
    )

    // Initialize result with 0 counts for all months of the year
    const months: FinalStatusByMonthModelsMetricResult = Array.from({ length: 12 }, (_, index) => (0)) as FinalStatusByMonthModelsMetricResult

    // Populate the months object with counts of models per month
    filteredModelsWithDates.forEach(({ date }) => {
      const modelMonth = date.getMonth()
      const isInRange =
        date >= actualStartDate &&
        date <= actualEndDate
      if (isInRange) {
        months[modelMonth]++
      }
    })

    return months
  }
}
