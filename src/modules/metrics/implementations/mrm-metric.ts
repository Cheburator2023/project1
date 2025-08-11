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
    
    // Модели за текущую дату (21.05.2025)
    const currentDayModels = this.filterModelsByExactDate(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели за delta дату (14.05.2025)
    const deltaDayModels = this.filterModelsByExactDate(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    const result = [];
    
    // Модели за текущую дату
    result.push(...currentDayModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      period: 'current'
    })));
    
    // Модели за delta дату
    result.push(...deltaDayModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      period: 'delta'
    })));

    return result;
  }

  // Новый метод для расчета delta по точным датам
  private calculateDeltaByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели точно на текущую дату (или endDate)
    const currentDayModels = this.filterModelsByExactDate(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели точно на дату-7 дней
    const deltaDayModels = this.filterModelsByExactDate(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );
    
    const result = currentDayModels.length - deltaDayModels.length;

    return result;
  }

  // Отдельный метод для фильтрации по точным датам (только для delta)
  private filterModelsByExactDate(
    models,
    exactStartDate: Date,
    exactEndDate: Date
  ) {
    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null
      const createDate = model.create_date ? new Date(model.create_date) : null

      const hasRelevantDates = releaseDate || developingEndDate || pilotEndDate;

      if (hasRelevantDates) {
        return (
          this.isWithinDateRange(releaseDate, exactStartDate, exactEndDate) ||
          this.isWithinDateRange(developingEndDate, exactStartDate, exactEndDate) ||
          this.isWithinDateRange(pilotEndDate, exactStartDate, exactEndDate)
        );
      } else {
        return this.isWithinDateRange(createDate, exactStartDate, exactEndDate);
      }
    });
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
