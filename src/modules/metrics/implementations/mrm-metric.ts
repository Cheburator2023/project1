import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class MrmMetric extends IndependentMetric<MetricResult> {
  private filteredModels: any[] = [];
  
  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const count = countFilteredModels.length
    
    // Новая delta логика по точным датам
    const delta = this.calculateDeltaByExactDates()

    this.filteredModels = countFilteredModels;

    return {
      count,
      delta
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      business_status: model.business_status
    }));
  }

  public getFilteredDeltaRowData() {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    const result = [];
    
    // Модели в текущем диапазоне
    result.push(...currentRangeModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      period: 'current'
    })));
    
    // Модели в delta диапазоне
    result.push(...deltaRangeModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      period: 'delta'
    })));

    return result;
  }

  // Новый метод для расчета delta по временным диапазонам
  private calculateDeltaByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );
    
    const result = currentRangeModels.length - deltaRangeModels.length;

    return result;
  }

  // Отдельный метод для фильтрации по временным диапазонам (для delta)
  private filterModelsByDateRange(
    models,
    startDate: Date,
    endDate: Date
  ) {
    return models.filter((model) => {
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
          this.isWithinDateRange(releaseDate, startDate, endDate) ||
          this.isWithinDateRange(developingEndDate, startDate, endDate) ||
          this.isWithinDateRange(pilotEndDate, startDate, endDate)
        );
      } else {
        return this.isWithinDateRange(createDate, startDate, endDate);
      }
    })
  }



  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, null)

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
