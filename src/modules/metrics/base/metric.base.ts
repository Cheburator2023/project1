import { BaseMetricResult, IMetric } from '../interfaces'
import { MetricsEnum } from '../enums'
import { FINAL_STATUSES } from '../constants'

// Базовый класс для метрики
export abstract class MetricBase<T extends BaseMetricResult> implements IMetric<T> {
  protected models: any[] = []
  protected tasks: any[] = []
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
   * @param {number | null} daysToShift - Number of days to shift the end date. Default is null.
   * @returns {{ actualStartDate: Date, actualEndDate: Date }} The actual start and end dates for filtering.
   */
  protected getActualDateRange(
    startDate: string | null,
    endDate: string | null,
    daysToShift: number | null = null
  ): {
    actualStartDate: Date,
    actualEndDate: Date
  } {
    let actualStartDate = startDate ? new Date(startDate) : new Date(1970, 0, 1)
    let actualEndDate = endDate ? new Date(endDate) : new Date(2970, 0, 1)

    if (daysToShift !== null) {
      actualEndDate = this.subtractWorkingDays(actualEndDate, daysToShift)
    }

    return { actualStartDate, actualEndDate }
  }

  /**
   * Helper method to subtract a given number of working days from a date.
   * Considers only weekdays (Monday to Friday).
   *
   * @param {Date} date - The original date.
   * @param {number} days - The number of working days to subtract.
   * @returns {Date} The new date with working days subtracted.
   */
  subtractWorkingDays(date: Date, days: number): Date {
    const newDate = new Date(date)

    while (days > 0) {
      newDate.setDate(newDate.getDate() - 1) // Move one day back

      // Check if the new date is a weekday (Monday to Friday)
      const dayOfWeek = newDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        days--
      }
    }

    return newDate
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
    return FINAL_STATUSES.includes(status)
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
