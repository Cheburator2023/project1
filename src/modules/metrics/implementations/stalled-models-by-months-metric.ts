import { USER_ROLES } from 'src/system/common';
import { IndependentMetric } from '../base'
import { StalledModelsByMonthMetricResult } from '../interfaces'

export class StalledModelsByMonthsMetric extends IndependentMetric<StalledModelsByMonthMetricResult> {
  private readonly VALIDATION_TASK_IDS = [
    'requirements_first_valid_datamart',
    'validation_parameters_approving',
  ];

  private readonly delayDays: number = 5;

  private shouldIncludeTask(task: { role: string; task_id: string }): boolean {
    const { role, task_id } = task;

    if (role === USER_ROLES.VALIDATOR || role === USER_ROLES.VALIDATOR_LEAD) {
      return this.VALIDATION_TASK_IDS.includes(task_id);
    }

    return true;
  }

  calculate() {
    const filteredTasks = this.filterTasks(
      this.tasks,
      this.startDate,
      this.endDate
    )

    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    );

    // Initialize result with 0 counts for all months of the year
    const months: StalledModelsByMonthMetricResult = Array.from({ length: 12 }, (_, index) => (0)) as StalledModelsByMonthMetricResult

    // Populate the months array with counts of models per month
    filteredTasks.forEach(({ update_date }) => {
      const date = new Date(update_date)
      const modelMonth = date.getMonth()

      // Check if the date is within the specified range
      if (date >= actualStartDate && date <= actualEndDate) {
        months[modelMonth]++
      }
    })

    return months
  }

  private filterTasks(tasks, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate);

    const delayThreshold = new Date();
    delayThreshold.setDate(delayThreshold.getDate() - this.delayDays);
    delayThreshold.setHours(23, 59, 59, 999);

    return tasks.filter((task) => {
      const date = task.update_date ? new Date(task.update_date) : null;

      return (
        this.isWithinDateRange(date, actualStartDate, actualEndDate) &&
        (this.delayDays === 0 || date <= delayThreshold) &&
        this.shouldIncludeTask(task)
      );
    });
  }

  public getFilteredRowData() {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      this.startDate,
      this.endDate
    );

    const filteredTasks = this.filterTasks(this.tasks, this.startDate, this.endDate);

    return filteredTasks
      .filter((task) => {
        const date = new Date(task.update_date);
        return date >= actualStartDate && date <= actualEndDate;
      })
      .map((task) => {
        const updateDate = new Date(task.update_date);
        const month = updateDate.getMonth();
        const monthName = updateDate.toLocaleString('ru-RU', { month: 'long' });

        return {
          system_model_id: task.model_id,
          role: task.role,
          ds_stream: task.ds_stream,
          name: task.name,
          task_id: task.task_id,
          update_date: updateDate.toISOString().replace('T', ' ').substring(0, 19),
          assignee: task.assignee,
          month: `${month + 1}`.padStart(2, '0'),
          month_name: monthName,
        };
      });
  }
}
