import {
  LIFE_CYCLE_STAGES,
  LIFE_CYCLE_STAGES_DESCRIPTION
} from 'src/system/common/constants'
import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class ImplementedMetric extends IndependentMetric<MetricResult> {
  private filteredModels: any[] = []

  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const count = countFilteredModels.length

    // Новая delta логика по точным датам
    const delta = this.calculateDeltaByExactDates()

    this.filteredModels = countFilteredModels

    return {
      count,
      delta
    }
  }

  // Новый метод для расчета delta по временным диапазонам
  private calculateDeltaByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      this.startDate,
      this.endDate
    )

    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    )

    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    )

    const result = currentRangeModels.length - deltaRangeModels.length

    return result
  }

  // Отдельный метод для фильтрации по временным диапазонам (для delta)
  private filterModelsByDateRange(models, startDate: Date, endDate: Date) {
    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation
        ? new Date(model.date_of_introduction_into_operation)
        : null

      /**
       * Условие: Если "Дата релиза" модели входит в выбранный временной срез,
       * И модель соответствует критериям внедрения,
       * ТО модель попадает в категорию "Внедренные модели".
       * Дата релиза должна попадать в диапазон [startDate, endDate]
       */
      if (
        this.isWithinDateRange(releaseDate, startDate, endDate) &&
        this.checkNotOutsidePim(model) &&
        (this.checkImplementedStatuses(model) ||
          this.checkRemovedStatuses(model))
      ) {
        return true
      }

      return false
    })
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      status: model.business_status,
      stage: model.model_status,
      status_uncut: model.business_status_uncut
    }))
  }

  public getFilteredDeltaRowData() {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(
      this.startDate,
      this.endDate
    )

    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    )

    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    )

    const result = []

    // Модели в текущем диапазоне
    result.push(
      ...currentRangeModels.map((model) => ({
        system_model_id: model.system_model_id,
        status: model.business_status,
        stage: model.model_status,
        date_of_introduction_into_operation:
          model.date_of_introduction_into_operation,
        period: 'current'
      }))
    )

    // Модели в delta диапазоне
    result.push(
      ...deltaRangeModels.map((model) => ({
        system_model_id: model.system_model_id,
        status: model.business_status,
        stage: model.model_status,
        date_of_introduction_into_operation:
          model.date_of_introduction_into_operation,
        period: 'past'
      }))
    )

    return result
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(
      startDate,
      endDate,
      null
    )

    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation
        ? new Date(model.date_of_introduction_into_operation)
        : null

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
        return true
      }

      return false
    })
  }

  private checkNotOutsidePim(model) {
    /**
     * Исключаем модели со статусом "вне ПИМ":
     * «Модель внедряется вне ПИМ» ИЛИ «Разработана, внедрена вне ПИМ» ИЛИ «Внедрена вне ПИМ»
     */
    let result = false
    const business_status_array = model.business_status_uncut
      ? model.business_status_uncut.split(';')
      : []
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель внедряется вне ПИМ',
          'Разработана, внедрена вне ПИМ',
          'Внедрена вне ПИМ'
        ].includes(statusItem)
    })

    return !result
  }

  private checkImplementedStatuses(model) {
    /**
     * ((Этап ЖЦМ равен значению «Внедрена») И (Статус модели равен одному из значений: «Модель была
     * внедрена в ПИМ (старая модель)» или «Модель внедряется в ПИМ» или «Разработана, внедрена в ПИМ»
     * или «Внедрена в ПИМ»))
     */
    if (
      model.model_status !==
      LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]
    ) {
      return false
    }

    let result = false
    const business_status_array = model.business_status
      ? model.business_status.split(';')
      : []
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель была внедрена в ПИМ (старая модель)',
          'Модель внедряется в ПИМ',
          'Разработана, внедрена в ПИМ',
          'Внедрена в ПИМ'
        ].includes(statusItem)
    })

    return result
  }

  private checkRemovedStatuses(model) {
    /**
     * ((Этап ЖЦМ равен значению «Вывод модели из эксплуатации») И (Статус
     * модели равен одному из значений: «Модель была внедрена в ПИМ (старая модель)» или «Модель
     * внедряется в ПИМ» или «Разработана, внедрена в ПИМ» или «Внедрена в ПИМ» или «Вывод модели из
     * эксплуатации» или «Архив»))
     */
    if (
      model.model_status !==
      LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.REMOVAL]
    ) {
      return false
    }

    let result = false
    const business_status_array = model.business_status
      ? model.business_status.split(';')
      : []
    business_status_array.forEach((statusItem) => {
      result =
        result ||
        [
          'Модель была внедрена в ПИМ (старая модель)',
          'Модель внедряется в ПИМ',
          'Разработана, внедрена в ПИМ',
          'Внедрена в ПИМ',
          'Вывод модели из эксплуатации',
          'Архив'
        ].includes(statusItem)
    })

    return result
  }
}
