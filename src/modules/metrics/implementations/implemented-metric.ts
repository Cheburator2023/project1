import {
  LIFE_CYCLE_STAGES,
  LIFE_CYCLE_STAGES_DESCRIPTION,
} from 'src/system/common/constants';
import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class ImplementedMetric extends IndependentMetric<MetricResult> {
  private filteredModels: any[] = [];
  
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

    this.filteredModels = countFilteredModels;

    return {
      count,
      delta
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      status: model.business_status,
      stage: model.model_status,
    }));
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

      /**
       * 1. Условие: Если "Дата релиза" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Внедренные модели".
       */
      if (
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.checkNotOutsidePim(model) &&
        (this.checkImplementedStatuses(model) ||
          this.checkRemovedStatuses(model))
      ) {
        return true;
      }

      return false;
    });
  }

  private checkNotOutsidePim(model) {
    /**
     * Исключаем модели со статусом "вне ПИМ":
     * «Модель внедряется вне ПИМ» ИЛИ «Разработана, внедрена вне ПИМ» ИЛИ «Внедрена вне ПИМ»
     */
    let result = false;
    const business_status_array = model.business_status
      ? model.business_status.split(';')
      : [];
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель внедряется вне ПИМ',
          'Разработана, внедрена вне ПИМ',
          'Внедрена вне ПИМ',
        ].includes(statusItem);
    });

    return !result;
  }

  private checkImplementedStatuses(model) {
    /**
     * ((Этап ЖЦМ равен значению «Внедрена») И (Статус модели равен одному из значений: «Модель была
     * внедрена в ПИМ (старая модель)» или «Модель внедряется в ПИМ» или «Разработана, внедрена в ПИМ»
     * или «Внедрена в ПИМ»))
     */
    if (model.model_status !== LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]) {
      return false;
    }

    let result = false;
    const business_status_array = model.business_status
      ? model.business_status.split(';')
      : [];
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель была внедрена в ПИМ (старая модель)',
          'Модель внедряется в ПИМ',
          'Разработана, внедрена в ПИМ',
          'Внедрена в ПИМ',
        ].includes(statusItem);
    });

    return result;
  }

  private checkRemovedStatuses(model) {
    /**
     * ((Этап ЖЦМ равен значению «Вывод модели из эксплуатации») И (Статус
     * модели равен одному из значений: «Модель была внедрена в ПИМ (старая модель)» или «Модель
     * внедряется в ПИМ» или «Разработана, внедрена в ПИМ» или «Внедрена в ПИМ» или «Вывод модели из
     * эксплуатации» или «Архив»))
     */
    if (model.model_status !== LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.REMOVAL]) {
      return false;
    }

    let result = false;
    const business_status_array = model.business_status
      ? model.business_status.split(';')
      : [];
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель была внедрена в ПИМ (старая модель)',
          'Модель внедряется в ПИМ',
          'Разработана, внедрена в ПИМ',
          'Внедрена в ПИМ',
          'Вывод модели из эксплуатации',
          'Архив',
        ].includes(statusItem);
    });

    return result;
  }
}
