import { USER_ROLES } from 'src/system/common'
import { IndependentMetric } from '../base'
import { StalledModelsByMonthMetricResult } from '../interfaces'

export class StalledModelsByMonthsMetric extends IndependentMetric<StalledModelsByMonthMetricResult> {
  private readonly VALIDATION_TASK_IDS = [
    'requirements_first_valid_datamart',
    'validation_parameters_approving'
  ]

  private readonly delayDays: number = 5

  private shouldIncludeTask(task: { role: string; task_id: string }): boolean {
    const { role, task_id } = task

    if (role === USER_ROLES.VALIDATOR || role === USER_ROLES.VALIDATOR_LEAD) {
      return this.VALIDATION_TASK_IDS.includes(task_id)
    }

    return true
  }

  protected getActualDateRange(
    startDate: string | null,
    endDate: string | null
  ): { actualStartDate: Date; actualEndDate: Date } {
    const actualStartDate = startDate
      ? new Date(startDate)
      : new Date(1970, 0, 1)
    const actualEndDate = endDate ? new Date(endDate) : new Date()

    if (this.delayDays > 0) {
      actualEndDate.setDate(actualEndDate.getDate() - this.delayDays)
    }

    actualEndDate.setHours(23, 59, 59, 999)

    return { actualStartDate, actualEndDate }
  }

  private filterTasks(tasks, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      startDate,
      endDate
    )

    return tasks.filter((task) => {
      const date = task.update_date ? new Date(task.update_date) : null

      return (
        this.isWithinDateRange(date, actualStartDate, actualEndDate) &&
        this.shouldIncludeTask(task)
      )
    })
  }

  calculate(): StalledModelsByMonthMetricResult {
    const filteredTasks = this.filterTasks(
      this.tasks,
      this.startDate,
      this.endDate
    )

    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    )

    const months: StalledModelsByMonthMetricResult = Array.from(
      { length: 12 },
      () => 0
    )

    filteredTasks.forEach(({ update_date }) => {
      const date = new Date(update_date)
      const modelMonth = date.getMonth()

      if (date >= actualStartDate && date <= actualEndDate) {
        months[modelMonth]++
      }
    })

    return months
  }

  public getFilteredRowData() {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    )

    const filteredTasks = this.filterTasks(
      this.tasks,
      this.startDate,
      this.endDate
    )

    return filteredTasks.map((task) => {
      const updateDate = new Date(task.update_date)
      const month = updateDate.getMonth()
      const monthName = updateDate.toLocaleString('ru-RU', { month: 'long' })

      return {
        system_model_id: task.model_id,
        role: task.role,
        ds_stream: task.ds_stream,
        name: task.name,
        task_id: task.task_id,
        update_date: updateDate
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
        assignee: task.assignee,
        month: `${month + 1}`.padStart(2, '0'),
        month_name: monthName
      }
    })
  }
}
