import { IIndependentMetric } from './metric.interface'
import { BaseMetricResult } from './base-metric-result.interface'

/**
 * Interface for FinalStatusMetric, extending IIndependentMetric.
 */
export interface IFinalStatusMetric<T extends BaseMetricResult> extends IIndependentMetric<T> {
  /**
   * Filters models by date range and status, optionally returning models with their relevant date.
   *
   * @param models - The list of models to filter.
   * @param startDate - The start of the date range.
   * @param endDate - The end of the date range.
   * @param isDeltaCalculation - Whether the calculation is for a delta period.
   * @param returnDate - If true, returns models with their relevant date.
   * @returns An array of models or an array of objects { model, date }.
   */
  filterModels<T extends boolean>(
    models: any[],
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation?: boolean,
    returnDate?: T
  ): T extends true ? { model: any; date: Date }[] : any[];
}
