import { IndependentMetric } from '../base';
import { DistributionByLifecycleStageModelsMetricResult } from '../interfaces';

export class DistributionByLifecycleStageMetric extends IndependentMetric<DistributionByLifecycleStageModelsMetricResult> {
  private filteredModels: any[] = [];
  private lifecycleStages: Map<string, number>;

  calculate(): DistributionByLifecycleStageModelsMetricResult {
    this.filteredModels = [];
    // Use a Map to dynamically count occurrences of each model_status
    this.lifecycleStages = new Map<string, number>();
    const filteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate,
    );

    // Iterate through all models to count model_status occurrences
    filteredModels.forEach((model) => {
      const stage = model.model_status;
      const status = model.business_status;

      if (!stage) {
        return;
      }

      const modelStageArray = stage.split(';');

      modelStageArray.forEach((stageItem) => {
        this.countStage(model, stageItem, status);
      });
    });

    // Convert the Map to an array of [status, count] pairs
    return Array.from(this.lifecycleStages.entries()) as DistributionByLifecycleStageModelsMetricResult;
  }

  private countStage(model, stage, status) {
    if (stage == 'Внедрена') {
      if (
        [
          'Модель была внедрена в ПИМ (старая модель)',
          'Модель внедряется в ПИМ',
          'Разработана, внедрена в ПИМ',
          'Внедрена в ПИМ',
        ].includes(status)
      ) {
        stage = 'Внедрена в ПИМ';
      }

      if (
        [
          'Модель внедряется вне ПИМ',
          'Разработана, внедрена вне ПИМ',
          'Внедрена вне ПИМ',
        ].includes(status)
      ) {
        stage = 'Внедрена вне ПИМ';
      }
    }

    this.filteredModels.push({ ...model, calculated_status: stage });

    if (this.lifecycleStages.has(stage)) {
      this.lifecycleStages.set(stage, this.lifecycleStages.get(stage)! + 1);
    } else {
      this.lifecycleStages.set(stage, 1);
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      status: model.business_status,
      stage: model.model_status,
      normalized_stage: model.calculated_status,
    }));
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate);

    return models.filter((model) => {
      const createDate = model.create_date ? new Date(model.create_date) : null;
      const releaseDate = model.date_of_introduction_into_operation
        ? new Date(model.date_of_introduction_into_operation)
        : null;
      const devEndDate = model.developing_end_date
        ? new Date(model.developing_end_date)
        : null;
      const pilotEndDate = model.data_completion_of_stage_05a
        ? new Date(model.data_completion_of_stage_05a)
        : null;

      /**
       * Если («Дата релиза» не равна пустому значению ИЛИ «Дата окончания разработки модели» не равна
       * пустому значению ИЛИ «Дата окончания разработки пилотной модели» не равна пустому значению), то
       * проверяем условие
       * {
       * [Если (один из атрибутов входит в выбранной временной срез: «Дата релиза» ИЛИ «Дата окончания
       * разработки Модели» или «Дата завершения разработки пилота»)
       */
      if (
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(devEndDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
      ) {
        return true;
      }

      /**
       * Если («Дата создания» входит в выбранной временной срез
       */
      if (
        releaseDate === null &&
        devEndDate === null &&
        pilotEndDate === null &&
        this.isWithinDateRange(createDate, actualStartDate, actualEndDate)
      ) {
        return true;
      }

      return false;
    });
  }
}