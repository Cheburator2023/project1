import { Injectable, BadRequestException } from '@nestjs/common'
import { ModelsService } from 'src/modules/models/models.service'
import { LoggerService } from '../../system/logger/logger.service'
import { ReportDataDto } from './dto/report-data.dto'
import { Artefact } from 'src/modules/models/interfaces'
import { parseDate, isValidDate, formatDateTime } from 'src/system/common/utils'
import { getDefaultModelRiskForReport } from 'src/modules/models/utils/model-risk.utils'

@Injectable()
export class ReportDataService {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Унифицированный метод получения моделей для отчетов
   * Использует DTO для передачи параметров, что соответствует DRY и KISS
   */
  async getReportModels(reportData: ReportDataDto): Promise<any[]> {
    const { date, groups, mode, reportDate, filters } = reportData

    try {
      const models = await this.modelsService.getModels(
        {
          date: date || null,
          mode: mode, // Явно передаем mode (даже если пустой массив)
          ignoreModeFilter: false,
        },
        groups || []
      )

      // Применяем расчет устаревания КМР, если указан reportDate и mode включает model_risk_calculation
      const modelsWithRiskCalculation = await this.calculateModelRiskAging(
        models,
        reportDate,
        mode
      )

      // Применяем дополнительные фильтры, если они переданы
      const filteredModels = filters ? await this.applyCustomFilters(
        modelsWithRiskCalculation,
        filters
      ) : modelsWithRiskCalculation

      return filteredModels
    } catch (error) {
      this.logger.error('Ошибка при получении моделей для отчета:', error)
      throw error
    }
  }

  /**
   * Расчет устаревания коэффициента модельного риска (КМР)
   * Соответствует принципу единственной ответственности (SOLID)
   */
  private async calculateModelRiskAging(
    models: any[],
    reportDate?: string,
    mode?: string[]
  ): Promise<any[]> {
    // Проверяем, является ли это отчетом "Расчёт модельного риска"
    const isModelRiskReport = mode?.includes('model_risk_calculation')

    if (!isModelRiskReport || !reportDate) {
      return models
    }

    this.logger.debug('Применяем расчет устаревания КМР для отчета', {
      reportDate,
      totalModels: models.length
    })

    const reportDateObj = parseDate(reportDate)
    if (!isValidDate(reportDate)) {
      throw new BadRequestException('Неверный формат даты для расчета КМР')
    }

    // Для расчета устаревания используем следующие правила:
    // 1. Если модель была валидирована менее года назад - КМР = 100%
    // 2. От 1 до 2 лет - КМР = 75%
    // 3. От 2 до 3 лет - КМР = 50%
    // 4. Более 3 лет - КМР = 25%
    // 5. Если дата валидации отсутствует - используем дату создания модели

    return models.map(model => {
      // Определяем дату для расчета (предпочтительно validation_result_approve_date, иначе create_date)
      const validationDateStr = model.validation_result_approve_date || model.create_date
      const createDateStr = model.create_date

      if (!validationDateStr && !createDateStr) {
        // Если дат нет, используем значение по умолчанию
        model.model_risk_coefficient = String(getDefaultModelRiskForReport(model.model_risk_coefficient))
        return model
      }

      const dateForCalculation = validationDateStr || createDateStr
      const calculationDate = parseDate(dateForCalculation)

      if (!isValidDate(dateForCalculation)) {
        model.model_risk_coefficient = String(getDefaultModelRiskForReport(model.model_risk_coefficient))
        return model
      }

      // Вычисляем разницу в годах между датой отчета и датой валидации/создания
      const diffYears = this.calculateYearDifference(reportDateObj, calculationDate)

      // Определяем КМР в зависимости от срока
      let kmrValue: number
      if (diffYears < 1) {
        kmrValue = 100 // Менее 1 года
      } else if (diffYears >= 1 && diffYears < 2) {
        kmrValue = 75  // От 1 до 2 лет
      } else if (diffYears >= 2 && diffYears < 3) {
        kmrValue = 50  // От 2 до 3 лет
      } else {
        kmrValue = 25  // Более 3 лет
      }

      // Сохраняем исходное значение для аудита
      model.original_model_risk_coefficient = model.model_risk_coefficient
      model.model_risk_coefficient = String(kmrValue)
      model.kmr_calculation_date = formatDateTime(reportDateObj)
      model.kmr_base_date = formatDateTime(calculationDate)
      model.kmr_years_diff = diffYears.toFixed(2)

      return model
    })
  }

  /**
   * Вычисление разницы в годах между двумя датами
   * Используется для расчета устаревания КМР
   */
  private calculateYearDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime())
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays / 365.25 // Учитываем високосные годы
  }

  /**
   * Применение пользовательских фильтров к моделям
   */
  private async applyCustomFilters(
    models: any[],
    filters: { [key: string]: string[] }
  ): Promise<any[]> {
    if (!filters || Object.keys(filters).length === 0) {
      return models
    }

    // Получаем артефакты для фильтрации
    const artefacts: Artefact[] = await this.modelsService.getArtefactLabels()
    const artefactsMap = this.mapArtefactsByKey(artefacts)

    return models.filter((model) => {
      return Object.keys(filters).every((filterKey) => {
        const filterValues = filters[filterKey]
        const artefactValue = model[filterKey]
        const artefact = artefactsMap[filterKey]

        if (!filterValues || filterValues.length === 0) {
          return true
        }

        if (!artefact) {
          return false
        }

        return this.applyFilter(
          artefactValue,
          filterValues,
          artefact.artefact_type_id
        )
      })
    })
  }

  /**
   * Применение фильтра к значению артефакта
   */
  private applyFilter(
    artefactValue: any,
    filterValues: string[],
    artefactTypeId: number
  ): boolean {
    const hasNullInFilter = filterValues.includes(null)
    const isValueEmpty = this.filterByEmpty(artefactValue)

    if (!hasNullInFilter && isValueEmpty) {
      return false
    }

    if (hasNullInFilter && isValueEmpty) {
      return true
    }

    // Типы артефактов (из interfaces/artefact.ts)
    const ArtefactTypeEnum = {
      DATE: 4,
      BOOLEAN: 6,
      TEXT: 1,
      DROPDOWN: 3,
      MULTI_DROPDOWN: 5,
      PERCENTAGE: 16,
      QUARTERLY_DATE: 17,
      QUARTERLY_DROPDOWN: 19
    }

    switch (artefactTypeId) {
      case ArtefactTypeEnum.DATE:
      case ArtefactTypeEnum.QUARTERLY_DATE:
        return this.filterByDate(artefactValue, filterValues)
      case ArtefactTypeEnum.BOOLEAN:
        return this.filterByBoolean(artefactValue, filterValues)
      case ArtefactTypeEnum.TEXT:
      case ArtefactTypeEnum.DROPDOWN:
      case ArtefactTypeEnum.MULTI_DROPDOWN:
      case ArtefactTypeEnum.QUARTERLY_DROPDOWN:
      case ArtefactTypeEnum.PERCENTAGE:
        return this.filterByString(artefactValue, filterValues)
      default:
        return false
    }
  }

  /**
   * Фильтрация по дате
   */
  private filterByDate(artefactValue: string, filterValues: string[]): boolean {
    if (!filterValues || filterValues.length !== 2) {
      return false
    }

    if (!isValidDate(artefactValue) || !isValidDate(filterValues[0]) || !isValidDate(filterValues[1])) {
      return false
    }

    const artefactDate = new Date(artefactValue)
    const startDate = new Date(filterValues[0])
    const endDate = new Date(filterValues[1])

    return artefactDate >= startDate && artefactDate <= endDate
  }

  /**
   * Фильтрация по булевым значениям
   */
  private filterByBoolean(artefactValue: string, filterValues: string[]): boolean {
    return filterValues.includes(artefactValue)
  }

  /**
   * Фильтрация по строковым значениям
   */
  private filterByString(artefactValue: string, filterValues: string[]): boolean {
    return filterValues.includes(artefactValue)
  }

  /**
   * Проверка на пустое значение
   */
  private filterByEmpty(artefactValue: any): boolean {
    return (
      artefactValue === null ||
      artefactValue === undefined ||
      artefactValue === ''
    )
  }

  /**
   * Создание карты артефактов по ключу для быстрого доступа
   */
  private mapArtefactsByKey(artefacts: Artefact[]): { [key: string]: Artefact } {
    return artefacts.reduce((acc, artefact) => {
      acc[artefact.artefact_tech_label] = artefact
      return acc
    }, {})
  }

  /**
   * Применение фильтров шаблонов к моделям
   */
  applyTemplateFilter(models: any[], template_id?: number): any[] {
    if (!template_id) {
      return models
    }

    switch (template_id) {
      case 1: // ПУРС - фильтр: record_id IS NOT NULL
        return models.filter(model =>
          model.record_id !== null &&
          model.record_id !== undefined &&
          model.record_id !== ''
        )
      case 2: // ПУМР - фильтр: active_model = '1'
        return models.filter(model => model.active_model === '1')
      default:
        return models
    }
  }

  /**
   * Форматирование моделей для конкретного шаблона
   */
  formatModelsForTemplate(models: any[], template_id?: number): any[] {
    if (!template_id) {
      return models
    }

    return models.map(model => {
      // Базовые поля, общие для всех шаблонов
      const baseModel = {
        system_model_id: model.system_model_id,
        update_date: model.update_date,
        model_name_validation: model.model_name_validation,
        model_desc: model.model_desc,
      }

      if (template_id === 1) {
        // Формат для ПУРС (template_id=1)
        return {
          ...baseModel,
          record_id: model.record_id,
          group_company: model.group_company,
          rating_system_name: model.rating_system_name,
          regulatory_code_rs_pvr: model.regulatory_code_rs_pvr,
          description_rating_system: model.description_rating_system,
          model_type: model.model_type,
          identifier_model_algorithm_for_rwa: model.identifier_model_algorithm_for_rwa,
          regulatory_code_model_pvr: model.regulatory_code_model_pvr,
          model_version: model.model_version,
          internal_model_number: model.internal_model_number,
          active_model: model.active_model,
          model_indicator: model.model_indicator,
          calibration_version: model.calibration_version,
          calibration_date: model.calibration_date,
          regulatory_code_of_asset_class: model.regulatory_code_of_asset_class,
          model_alias: model.model_alias,
          model_id_from_model_owner: model.model_id_from_model_owner,
          classification_rs_algorithm_by_asset_classes: model.classification_rs_algorithm_by_asset_classes,
          significance_validity: model.significance_validity,
          degree_of_regulatory_supervision: model.degree_of_regulatory_supervision,
          materiality_rate: model.materiality_rate,
          impact_coverage: model.impact_coverage,
          responsible_for_significance_validity: model.responsible_for_significance_validity,
          classification_of_rs_by_order_of_application_within_pvr: model.classification_of_rs_by_order_of_application_within_pvr,
          credit_risk_component: model.credit_risk_component,
          method_calculation_model_parameter: model.method_calculation_model_parameter,
          segment_name: model.segment_name,
          implementation_segment: model.implementation_segment,
          regulatory_class: model.regulatory_class,
          regulatory_subclass: model.regulatory_subclass,
          business_customer: model.business_customer,
          business_customer_departament: model.business_customer_departament,
          goals_using_results_of_work_rs: model.goals_using_results_of_work_rs,
          implementation_validity: model.implementation_validity,
          validity_approve: model.validity_approve,
          bank_document: model.bank_document,
          rs_model_decommiss_date: model.rs_model_decommiss_date,
          remove_decision: model.remove_decision,
          ds_department: model.ds_department,
          assignment_contractor: model.assignment_contractor,
          developing_start_date: model.developing_start_date,
          developing_end_date: model.developing_end_date,
          data_source_description: model.data_source_description,
          target: model.target,
          calibration_method: model.calibration_method,
          developing_report: model.developing_report,
          name_and_version_rating_system: model.name_and_version_rating_system,
          version_it_implementation: model.version_it_implementation,
          responsible_subdivision_and_project_lead_for_it_implementation: model.responsible_subdivision_and_project_lead_for_it_implementation,
          date_of_it_introduction_into_operation: model.date_of_it_introduction_into_operation,
          psi_protocol: model.psi_protocol,
          validation_department: model.validation_department,
          plan_validation_type: model.plan_validation_type,
          validation_period: model.validation_period,
          validation_report_approve_date: model.validation_report_approve_date,
          validation_result: model.validation_result,
          validation_result_approve_date: model.validation_result_approve_date,
          auto_validation_result: model.auto_validation_result,
          importance_changes: model.importance_changes,
          approve_importance: model.approve_importance,
          approve_importance_changes: model.approve_importance_changes,
          date_and_number_regulator_notification: model.date_and_number_regulator_notification,
          date_submission_to_regulator: model.date_submission_to_regulator,
          decision_date_and_number_of_application_model_for_segment: model.decision_date_and_number_of_application_model_for_segment,
          notification_date_and_number_of_application_model_for_segment: model.notification_date_and_number_of_application_model_for_segment,
          decision_date_and_number_of_application_model: model.decision_date_and_number_of_application_model,
          notification_date_and_number_of_application_model: model.notification_date_and_number_of_application_model,
          start_date_of_application_model_approved_regulator: model.start_date_of_application_model_approved_regulator
        }
      } else if (template_id === 2) {
        // Формат для ПУМР (template_id=2)
        return {
          ...baseModel,
          group_company: model.group_company,
          model_id: model.model_id,
          model_version: model.model_version,
          model_type: model.model_type,
          model_risk_type: model.model_risk_type,
          implementation_segment: model.implementation_segment,
          business_customer: model.business_customer,
          business_customer_departament: model.business_customer_departament,
          significance_validity: model.significance_validity,
          responsible_for_significance_validity: model.responsible_for_significance_validity,
          implementation_validity: model.implementation_validity,
          validity_approve: model.validity_approve,
          rs_model_decommiss_date: model.rs_model_decommiss_date,
          remove_decision: model.remove_decision,
          model_changes_info: model.model_changes_info,
          ds_department: model.ds_department,
          developing_report: model.developing_report,
          developing_end_date: model.developing_end_date,
          validation_report_approve_date: model.validation_report_approve_date,
          validation_result: model.validation_result,
          validation_result_approve_date: model.validation_result_approve_date,
          auto_validation_result: model.auto_validation_result,
          active_model: model.active_model,
          model_risk_coefficient: model.model_risk_coefficient
        }
      }

      return model
    })
  }
}
