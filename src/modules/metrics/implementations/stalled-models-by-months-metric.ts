import { IndependentMetric } from '../base'
import { StalledModelsByMonthMetricResult } from '../interfaces'

export class StalledModelsByMonthsMetric extends IndependentMetric<StalledModelsByMonthMetricResult> {
  /**
   * Overrides the base getActualDateRange method.
   * If startDate and endDate are not provided, defaults to the beginning of the current year
   * and the current date. Optionally shifts the end date by a specified number of working days.
   *
   * @param {string | null} startDate - The start date of the time slice.
   * @param {string | null} endDate - The end date of the time slice.
   * @param {number | null} daysToShift - Number of working days to shift the end date. Default is null (no shift).
   * @returns {{ actualStartDate: Date; actualEndDate: Date }} The actual start and end dates for filtering.
   */
  getActualDateRange(
    startDate: string | null,
    endDate: string | null,
    daysToShift: number | null = null
  ): { actualStartDate: Date; actualEndDate: Date } {
    let actualStartDate: Date
    let actualEndDate: Date

    if (!startDate && !endDate) {
      const now = new Date()
      const year = now.getFullYear()

      // Default to the start of the current year
      actualStartDate = new Date(year, 0, 1) // January 1st
      // Default to the current date
      actualEndDate = now
    } else {
      // Call the base method to get actual start and end dates
      const baseDates = super.getActualDateRange(startDate, endDate, daysToShift)
      actualStartDate = baseDates.actualStartDate
      actualEndDate = baseDates.actualEndDate
    }

    // Apply shift to end date if daysToShift is provided
    if (daysToShift !== null) {
      actualEndDate = this.subtractWorkingDays(actualEndDate, daysToShift)
    }

    return { actualStartDate, actualEndDate }
  }

  calculate() {
    const filteredAssignments = this.filterAssignments(
      this.assignments,
      this.startDate,
      this.endDate
    )

    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    )

    // Initialize result with 0 counts for all months of the year
    const months: StalledModelsByMonthMetricResult = Array.from({ length: 12 }, (_, index) => (0)) as StalledModelsByMonthMetricResult

    // Populate the months array with counts of models per month
    filteredAssignments.forEach(({ effective_from }) => {
      const date = new Date(effective_from)
      const modelMonth = date.getMonth()

      // Check if the date is within the specified range
      if (date >= actualStartDate && date <= actualEndDate) {
        months[modelMonth]++
      }
    })

    return months
  }

  private filterAssignments(assignments, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, 5)

    return assignments.filter((assignment) =>
      this.isWithinDateRange(
        assignment.effective_from ? new Date(assignment.effective_from) : null,
        actualStartDate,
        actualEndDate
      )
    )
  }
}
