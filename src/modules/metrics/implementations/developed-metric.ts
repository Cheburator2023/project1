import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class DevelopedMetric extends IndependentMetric<MetricResult> {
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
      ds_stream: model.ds_stream
    }));
  }

  public getFilteredDeltaRowData() {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели за текущую дату
    const currentDayModels = this.filterModelsByExactDate(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели за delta дату
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

    return currentDayModels.length - deltaDayModels.length;
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

      /**
       * 1. Условие: модель с завершенной стадией разработки,
       *    НО при этом еще НЕ внедренная.
       */
      if (
        this.isOutsideDateRange(releaseDate, exactStartDate, exactEndDate) &&
        this.isWithinDateRange(developingEndDate, exactStartDate, exactEndDate)
      ) {
        return true
      }

      /**
       * 2. Условие: модель с завершенной стадией пилота (05A),
       *    НО при этом НЕ завершена стадия разработки (04) И НЕ внедрена.
       */
      if (
        this.isOutsideDateRange(releaseDate, exactStartDate, exactEndDate) &&
        this.isOutsideDateRange(developingEndDate, exactStartDate, exactEndDate) &&
        this.isWithinDateRange(pilotEndDate, exactStartDate, exactEndDate)
      ) {
        return true
      }

      return false
    })
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation ? 7 : null)

    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null

      /**
       * 1. Условие: Если "Дата релиза" модели НЕ входит в выбранный временной срез,
       *    И "Дата окончания разработки" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Разработанные модели".
       */
      if (
        this.isOutsideDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.isWithinDateRange(developingEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      /**
       * 2. Условие: Если Дата релиза модели НЕ входит в выбранный временной срез,
       *    И Дата окончания разработки модели НЕ входит в выбранный временной срез,
       *    И Дата завершения разработки пилота входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Разработанные модели".
       */
      if (
        this.isOutsideDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.isOutsideDateRange(developingEndDate, actualStartDate, actualEndDate) &&
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }
}
