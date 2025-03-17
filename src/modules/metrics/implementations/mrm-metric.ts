import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class MrmMetric extends IndependentMetric<MetricResult> {
  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const deltaFilteredModels = this.filterModels(
      countFilteredModels,
      this.startDate,
      this.endDate,
      true
    )

    const count = countFilteredModels.length
    const delta = count - deltaFilteredModels.length

    return {
      count,
      delta
    }
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation ? 7 : null)

    return models.filter((model) => {
      // const decomissDate = model.rs_model_decommiss_date ? new Date(model.rs_model_decommiss_date) : null
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null
      const createDate = model.create_date ? new Date(model.create_date) : null

      /**
       * Условия расчета для категории «Модели в MRM СУМ»:
       * 
       * Если хотя бы одна из дат («Дата релиза», «Дата окончания разработки модели», «Дата завершения разработки пилота») не пустая,
       * ТО проверяем, попадает ли хотя бы одна из этих дат в выбранный временной срез.
       * 
       * Иначе проверяем, входит ли «Дата создания» модели в выбранный временной срез.
       */
      const hasRelevantDates = releaseDate || developingEndDate || pilotEndDate;

      if (hasRelevantDates) {
        return (
          this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) ||
          this.isWithinDateRange(developingEndDate, actualStartDate, actualEndDate) ||
          this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
        );
      } else {
        return this.isWithinDateRange(createDate, actualStartDate, actualEndDate);
      }
    });
  }
}
