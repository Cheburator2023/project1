import { BaseMetricResult, IMetric } from '../interfaces'
import { MetricsEnum } from '../enums'
import { finalStatuses } from '../constants'

// Базовый класс для метрики
export abstract class MetricBase<T extends BaseMetricResult> implements IMetric<T> {
  protected models: any[] = []
  protected startDate: string | null = null
  protected endDate: string | null = null

  constructor(protected metricName: MetricsEnum) {
  }

  initialize(...args: any[]): void {
    throw new Error('Method not implemented.')
  }

  /**
   * Method to get the actual date range for filtering models
   * depending on whether a time slice is applied and delta calculation is required.
   *
   * @param {Date | null} startDate - The start date of the time slice.
   * @param {Date | null} endDate - The end date of the time slice.
   * @param {boolean} isDeltaCalculation - Whether to calculate delta (if true, subtracts 7 days from endDate).
   * @returns {{ actualStartDate: Date, actualEndDate: Date }} The actual start and end dates for filtering.
   */
  protected getActualDateRange(
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean
  ): {
    actualStartDate: Date,
    actualEndDate: Date
  } {
    let actualStartDate = new Date(startDate)
    let actualEndDate = new Date(endDate)

    // Case 1: If both startDate and endDate are provided
    if (startDate && endDate) {
      if (isDeltaCalculation) {
        actualEndDate = this.subtractDays(endDate, 7) // Subtract 7 days from endDate for delta calculation
      }
    } else if (!startDate && !endDate) {
      // Case 2: If both startDate and endDate are not provided
      actualStartDate = new Date(1970, 0, 1) // Set to epoch start date (1970-01-01)
      if (isDeltaCalculation) {
        actualEndDate = this.getCurrentDateMinusDays(7) // Use current date minus 7 days for delta calculation
      } else {
        actualEndDate = new Date(2970, 0, 1) // Set end date to a distant future if no time slice is provided
      }
    }

    return { actualStartDate, actualEndDate }
  }

  /**
   * Subtracts a given number of days from a date.
   *
   * @param {string} date - The date to subtract days from.
   * @param {number} days - The number of days to subtract.
   * @returns {Date} The resulting date after subtracting the specified number of days.
   */
  protected subtractDays(date: string, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() - days)
    return result
  }

  /**
   * Gets the current date minus a specified number of days.
   *
   * @param {number} days - The number of days to subtract.
   * @returns {Date} The resulting date after subtracting the specified number of days from the current date.
   */
  protected getCurrentDateMinusDays(days: number): Date {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date
  }

  /**
   * Checks if a given date is within the specified date range.
   *
   * @param {Date | null} date - The date to check.
   * @param {Date} startDate - The start date of the range.
   * @param {Date} endDate - The end date of the range.
   * @returns {boolean} True if the date is within the range, false otherwise.
   */
  protected isWithinDateRange(date: Date | null, startDate: Date, endDate: Date): boolean {
    return date && date >= startDate && date <= endDate
  }

  /**
   * Checks if a given date is outside the specified date range.
   *
   * @param {Date | null} date - The date to check.
   * @param {Date} startDate - The start date of the range.
   * @param {Date} endDate - The end date of the range.
   * @returns {boolean} True if the date is outside the range, false otherwise.
   */
  protected isOutsideDateRange(date: Date | null, startDate: Date, endDate: Date): boolean {
    return !date || date < startDate || date > endDate
  }

  protected isFinalStatus(status: string): boolean {
    return finalStatuses.includes(status)
  }

  protected boundPercentage(value: number): number {
    return Math.min(100, Math.max(-100, value))
  }

  protected calculatePercentageDelta(
    current: number,
    previous: number
  ): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }

    const difference = current - previous
    const percentageChange = (difference / previous) * 100

    return this.boundPercentage(Math.round(percentageChange))
  }

  /**
   * Calculates the percentage ratio of one value to another
   * @param part The part (e.g., the number of models in MRM)
   * @param total The total (e.g., the total number of models)
   * @returns The percentage ratio
   */
  protected calculatePercentageCount(
    part: number,
    total: number
  ): number {
    if (total === 0) {
      return 0
    }

    const percentageChange = (part / total) * 100

    return this.boundPercentage(Math.round(percentageChange))
  }

  getMetricName(): MetricsEnum {
    return this.metricName
  }

  abstract calculate(): T;
}
