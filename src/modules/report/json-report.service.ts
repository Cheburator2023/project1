import { Injectable } from '@nestjs/common'
import { ReportGenerationError } from 'src/common/errors'
import { ReportValidationService } from './report-validation.service'
import { ReportCacheService } from './report-cache.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsService } from 'src/modules/models/models.service'
import { LoggerService } from '../../system/logger/logger.service'

@Injectable()
export class JsonReportService {

  constructor(
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly modelsService: ModelsService,
    private readonly validationService: ReportValidationService,
    private readonly cacheService: ReportCacheService,
    private readonly logger: LoggerService,
  ) {}

  async getJsonReport(
    template_id?: number,
    date?: string,
    groups?: string[]
  ): Promise<{ [key: string]: any[] }> {
    // Валидация входных параметров
    this.validationService.validateJsonReportRequest(template_id, date, groups)

    // Формируем дату отчета
    let reportDate: Date
    if (date) {
      reportDate = this.validationService.validateDate(date)!
    } else {
      reportDate = new Date()
    }

    const formattedDate = reportDate.toISOString().split('T')[0]

    // Проверяем кэш
    const cacheKey = this.cacheService.generateJsonReportCacheKey(template_id, formattedDate, groups)
    const cachedResult = await this.cacheService.get(cacheKey)
    if (cachedResult) {
      this.logger.info('Используется кэшированный результат JSON отчета')
      return cachedResult as { [key: string]: any[] }
    }

    try {
      let result: { [key: string]: any[] }

      if (template_id) {
        // Для отчетов с template_id используем оптимизированный SQL-запрос
        result = await this.getReportByTemplate(template_id, formattedDate)
      } else {
        // Для общего реестра используем существующий код
        const models = await this.modelsService.getModels(
          {
            date: formattedDate,
            mode: []
          },
          groups || []
        )

        // Формируем структуру ответа
        result = {
          [`reports_${formattedDate}`]: models
        }
      }

      // Проверка, что результат не пустой
      if (!result || !result[`reports_${formattedDate}`]) {
        this.logger.warn('Отчет не содержит данных', { template_id, date: formattedDate })
        // Возвращаем пустой отчет вместо ошибки
        result = {
          [`reports_${formattedDate}`]: []
        }
      }

      // Сохраняем в кэш на 5 минут
      await this.cacheService.set(cacheKey, result, 300000)

      this.logger.info('JSON отчет успешно сформирован и закэширован')
      return result
    } catch (error) {
      this.logger.error(`Ошибка при формировании JSON отчета: ${error.message}`, error.stack)
      throw new ReportGenerationError('Ошибка при формировании отчета')
    }
  }

  private async getReportByTemplate(
    template_id: number,
    date: string
  ): Promise<{ [key: string]: any[] }> {
    const query = this.getTemplateQuery(template_id)

    try {
      this.logger.debug(`Выполнение SQL-запроса для шаблона: template_id=${template_id}, date=${date}`)

      const result = await this.mrmDatabaseService.query(query, [template_id, date])

      // Обработка результатов запроса
      const rows = this.extractRowsFromResult(result)

      if (!Array.isArray(rows)) {
        throw new ReportGenerationError('Некорректный формат ответа от базы данных')
      }

      this.logger.debug(`Получено строк из БД: ${rows.length}`)

      // Извлекаем данные из template_json
      const data = rows
        .filter(row => row?.template_json?.template_value)
        .map(row => row.template_json.template_value)

      this.logger.debug(`Данные после фильтрации: ${data.length} записей`)

      // Формируем структуру ответа
      const resultData = {
        [`reports_${date}`]: data
      }

      return resultData
    } catch (error) {
      this.logger.error(`Ошибка SQL-запроса для шаблона ${template_id}: ${error.message}`)

      if (error.message?.includes('syntax error') || error.message?.includes('SQL')) {
        throw new ReportGenerationError('Ошибка в SQL-запросе')
      }

      if (error.message?.includes('connection') || error.message?.includes('database')) {
        throw new ReportGenerationError('Ошибка подключения к базе данных')
      }

      throw error
    }
  }

  private getTemplateQuery(template_id: number): string {
    // SQL запрос остается тем же, что и в оригинальном коде
    return `
      WITH filtered_models AS (
        SELECT
          m.model_id AS system_model_id,
          m.model_version,
          m.update_date,
          artefact_data.*,
          artefact_values_data.business_customer_departament
        FROM models_new m
               LEFT JOIN (
          SELECT
            ar.model_id as artefacts_model_id,
            -- Общие артефакты для обоих template_id
            MAX(CASE WHEN artefact_id = 2000 THEN artefact_string_value ELSE NULL END) AS record_id,
            MAX(CASE WHEN artefact_id = 2001 THEN artefact_string_value ELSE NULL END) AS model_id,
            MAX(CASE WHEN artefact_id = 2002 THEN artefact_string_value ELSE NULL END) AS group_company,
            MAX(CASE WHEN artefact_id = 2003 THEN artefact_string_value ELSE NULL END) AS rating_system_name,
            MAX(CASE WHEN artefact_id = 2004 THEN artefact_string_value ELSE NULL END) AS regulatory_code_rs_pvr,
            MAX(CASE WHEN artefact_id = 2005 THEN artefact_string_value ELSE NULL END) AS description_rating_system,
            MAX(CASE WHEN artefact_id = 2007 THEN artefact_string_value ELSE NULL END) AS model_type,
            MAX(CASE WHEN artefact_id = 2008 THEN artefact_string_value ELSE NULL END) AS identifier_model_algorithm_for_rwa,
            MAX(CASE WHEN artefact_id = 2009 THEN artefact_string_value ELSE NULL END) AS regulatory_code_model_pvr,
            MAX(CASE WHEN artefact_id = 2010 THEN artefact_string_value ELSE NULL END) AS internal_model_number,
            MAX(CASE WHEN artefact_id = 2011 THEN artefact_string_value ELSE NULL END) AS active_model,
            MAX(CASE WHEN artefact_id = 2012 THEN artefact_string_value ELSE NULL END) AS model_indicator,
            MAX(CASE WHEN artefact_id = 2014 THEN artefact_string_value ELSE NULL END) AS calibration_version,
            MAX(CASE WHEN artefact_id = 2015 THEN artefact_string_value ELSE NULL END) AS calibration_date,
            MAX(CASE WHEN artefact_id = 2016 THEN artefact_string_value ELSE NULL END) AS regulatory_code_of_asset_class,
            MAX(CASE WHEN artefact_id = 2017 THEN artefact_string_value ELSE NULL END) AS model_id_from_model_owner,
            MAX(CASE WHEN artefact_id = 2018 THEN artefact_string_value ELSE NULL END) AS classification_rs_algorithm_by_asset_classes,
            MAX(CASE WHEN artefact_id = 2019 THEN artefact_string_value ELSE NULL END) AS significance_validity,
            MAX(CASE WHEN artefact_id = 2020 THEN artefact_string_value ELSE NULL END) AS degree_of_regulatory_supervision,
            MAX(CASE WHEN artefact_id = 2021 THEN artefact_string_value ELSE NULL END) AS materiality_rate,
            MAX(CASE WHEN artefact_id = 2022 THEN artefact_string_value ELSE NULL END) AS impact_coverage,
            MAX(CASE WHEN artefact_id = 2023 THEN artefact_string_value ELSE NULL END) AS responsible_for_significance_validity,
            MAX(CASE WHEN artefact_id = 2024 THEN artefact_string_value ELSE NULL END) AS classification_of_rs_by_order_of_application_within_pvr,
            MAX(CASE WHEN artefact_id = 2025 THEN artefact_string_value ELSE NULL END) AS credit_risk_component,
            MAX(CASE WHEN artefact_id = 2026 THEN artefact_string_value ELSE NULL END) AS method_calculation_model_parameter,
            MAX(CASE WHEN artefact_id = 2027 THEN artefact_string_value ELSE NULL END) AS segment_name,
            MAX(CASE WHEN artefact_id = 2028 THEN artefact_string_value ELSE NULL END) AS implementation_segment,
            MAX(CASE WHEN artefact_id = 2029 THEN artefact_string_value ELSE NULL END) AS regulatory_class,
            MAX(CASE WHEN artefact_id = 2030 THEN artefact_string_value ELSE NULL END) AS regulatory_subclass,
            MAX(CASE WHEN artefact_id = 2031 THEN artefact_string_value ELSE NULL END) AS business_customer,
            MAX(CASE WHEN artefact_id = 2033 THEN artefact_string_value ELSE NULL END) AS goals_using_results_of_work_rs,
            MAX(CASE WHEN artefact_id = 2034 THEN artefact_string_value ELSE NULL END) AS implementation_validity,
            MAX(CASE WHEN artefact_id = 2035 THEN artefact_string_value ELSE NULL END) AS validity_approve,
            MAX(CASE WHEN artefact_id = 2036 THEN artefact_string_value ELSE NULL END) AS bank_document,
            MAX(CASE WHEN artefact_id = 2037 THEN artefact_string_value ELSE NULL END) AS rs_model_decommiss_date,
            MAX(CASE WHEN artefact_id = 2038 THEN artefact_string_value ELSE NULL END) AS remove_decision,
            MAX(CASE WHEN artefact_id = 2039 THEN artefact_string_value ELSE NULL END) AS ds_department,
            MAX(CASE WHEN artefact_id = 2040 THEN artefact_string_value ELSE NULL END) AS developing_start_date,
            MAX(CASE WHEN artefact_id = 2041 THEN artefact_string_value ELSE NULL END) AS developing_end_date,
            MAX(CASE WHEN artefact_id = 2042 THEN artefact_string_value ELSE NULL END) AS data_source_description,
            MAX(CASE WHEN artefact_id = 2043 THEN artefact_string_value ELSE NULL END) AS target,
            MAX(CASE WHEN artefact_id = 2044 THEN artefact_string_value ELSE NULL END) AS calibration_method,
            MAX(CASE WHEN artefact_id = 2045 THEN artefact_string_value ELSE NULL END) AS developing_report,
            MAX(CASE WHEN artefact_id = 2046 THEN artefact_string_value ELSE NULL END) AS name_and_version_rating_system,
            MAX(CASE WHEN artefact_id = 2047 THEN artefact_string_value ELSE NULL END) AS version_it_implementation,
            MAX(CASE WHEN artefact_id = 2048 THEN artefact_string_value ELSE NULL END) AS responsible_subdivision_and_project_lead_for_it_implementation,
            MAX(CASE WHEN artefact_id = 2049 THEN artefact_string_value ELSE NULL END) AS date_of_it_introduction_into_operation,
            MAX(CASE WHEN artefact_id = 2050 THEN artefact_string_value ELSE NULL END) AS psi_protocol,
            MAX(CASE WHEN artefact_id = 2051 THEN artefact_string_value ELSE NULL END) AS validation_department,
            MAX(CASE WHEN artefact_id = 2052 THEN artefact_string_value ELSE NULL END) AS plan_validation_type,
            MAX(CASE WHEN artefact_id = 2053 THEN artefact_string_value ELSE NULL END) AS validation_period,
            MAX(CASE WHEN artefact_id = 2054 THEN artefact_string_value ELSE NULL END) AS validation_report_approve_date,
            MAX(CASE WHEN artefact_id = 2055 THEN artefact_string_value ELSE NULL END) AS validation_result_approve_date,
            MAX(CASE WHEN artefact_id = 2056 THEN artefact_string_value ELSE NULL END) AS auto_validation_result,
            MAX(CASE WHEN artefact_id = 2057 THEN artefact_string_value ELSE NULL END) AS importance_changes,
            MAX(CASE WHEN artefact_id = 2058 THEN artefact_string_value ELSE NULL END) AS approve_importance,
            MAX(CASE WHEN artefact_id = 2059 THEN artefact_string_value ELSE NULL END) AS approve_importance_changes,
            MAX(CASE WHEN artefact_id = 2060 THEN artefact_string_value ELSE NULL END) AS date_and_number_regulator_notification,
            MAX(CASE WHEN artefact_id = 2061 THEN artefact_string_value ELSE NULL END) AS date_submission_to_regulator,
            MAX(CASE WHEN artefact_id = 2062 THEN artefact_string_value ELSE NULL END) AS start_date_of_application_model_approved_regulator,
            MAX(CASE WHEN artefact_id = 2071 THEN artefact_string_value ELSE NULL END) AS model_risk_type,
            MAX(CASE WHEN artefact_id = 2072 THEN artefact_string_value ELSE NULL END) AS model_changes_info,
            MAX(CASE WHEN artefact_id = 2075 THEN artefact_string_value ELSE NULL END) AS assignment_contractor,
            MAX(CASE WHEN artefact_id = 2095 THEN artefact_string_value ELSE NULL END) AS validation_result,
            MAX(CASE WHEN artefact_id = 2557 THEN artefact_string_value ELSE NULL END) AS model_name_validation,
            MAX(CASE WHEN artefact_id = 2659 THEN artefact_string_value ELSE NULL END) AS model_desc
          FROM (
                 SELECT
                   artefact_realizations_new.model_id,
                   artefact_realizations_new.artefact_id,
                   artefact_realizations_new.artefact_string_value,
                   artefact_realizations_new.effective_from,
                   ROW_NUMBER() OVER (
              PARTITION BY artefact_realizations_new.model_id, artefact_realizations_new.artefact_id
              ORDER BY 
                CASE 
                  WHEN $2::DATE IS NULL THEN artefact_realizations_new.effective_from
                  WHEN DATE_TRUNC('day', artefact_realizations_new.effective_from)::DATE <= $2
                  THEN artefact_realizations_new.effective_from
                  ELSE TO_TIMESTAMP('1900-01-01', 'YYYY-MM-DD')
                END DESC
            ) AS rn
                 FROM artefact_realizations_new
                 WHERE artefact_realizations_new.effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
                   AND (
                   $2::DATE IS NULL
                   OR DATE_TRUNC('day', artefact_realizations_new.effective_from)::DATE <= $2
                   )
               ) ar
          WHERE ar.rn = 1
          GROUP BY ar.model_id
        ) AS artefact_data ON m.model_id = artefact_data.artefacts_model_id
               LEFT JOIN (
          SELECT
            ar.model_id as artefacts_model_id,
            STRING_AGG((CASE WHEN ar.artefact_id = 2032 THEN av.artefact_value ELSE NULL END)::Varchar, ',' ORDER BY ar.artefact_value_id) AS business_customer_departament
          FROM artefact_realizations_new ar
                 INNER JOIN artefact_values av ON ar.artefact_value_id = av.artefact_value_id AND av.is_active_flg = '1'
          WHERE ar.effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
            AND (
            $2::DATE IS NULL
            OR DATE_TRUNC('day', ar.effective_from)::DATE <= $2
            )
          GROUP BY ar.model_id
        ) AS artefact_values_data ON m.model_id = artefact_values_data.artefacts_model_id
        WHERE
          (m.temp_block_flag != 1 OR m.temp_block_flag IS NULL)
          AND (
          $2::DATE IS NULL
          OR m.create_date <= $2
          )
      )
      SELECT
        CASE
          WHEN $1 = 1 THEN
            jsonb_build_object(
              'user_id', NULL,
              'isOwner', FALSE,
              'public', TRUE,
              'template_id', 1,
              'template_name', 'Реестр рейтинговых систем в соответствии с ПУРС',
              'template_value',
              jsonb_build_object(
                -- Первая группа полей (40 полей)
                'system_model_id', system_model_id,
                'record_id', record_id,
                'group_company', group_company,
                'update_date', update_date,
                'rating_system_name', rating_system_name,
                'regulatory_code_rs_pvr', regulatory_code_rs_pvr,
                'description_rating_system', description_rating_system,
                'model_name_validation', model_name_validation,
                'model_desc', model_desc,
                'model_type', model_type,
                'identifier_model_algorithm_for_rwa', identifier_model_algorithm_for_rwa,
                'regulatory_code_model_pvr', regulatory_code_model_pvr,
                'model_version', model_version,
                'internal_model_number', internal_model_number,
                'active_model', active_model,
                'model_indicator', model_indicator,
                'calibration_version', calibration_version,
                'calibration_date', calibration_date,
                'regulatory_code_of_asset_class', regulatory_code_of_asset_class,
                'model_alias', NULL,
                'model_id_from_model_owner', model_id_from_model_owner,
                'classification_rs_algorithm_by_asset_classes', classification_rs_algorithm_by_asset_classes,
                'significance_validity', significance_validity,
                'degree_of_regulatory_supervision', degree_of_regulatory_supervision,
                'materiality_rate', materiality_rate,
                'impact_coverage', impact_coverage,
                'responsible_for_significance_validity', responsible_for_significance_validity,
                'classification_of_rs_by_order_of_application_within_pvr', classification_of_rs_by_order_of_application_within_pvr,
                'credit_risk_component', credit_risk_component,
                'method_calculation_model_parameter', method_calculation_model_parameter,
                'segment_name', segment_name,
                'implementation_segment', implementation_segment,
                'regulatory_class', regulatory_class,
                'regulatory_subclass', regulatory_subclass,
                'business_customer', business_customer
              ) ||
              jsonb_build_object(
                -- Вторая группа полей (40 полей)
                'business_customer_departament', business_customer_departament,
                'goals_using_results_of_work_rs', goals_using_results_of_work_rs,
                'implementation_validity', implementation_validity,
                'validity_approve', validity_approve,
                'bank_document', bank_document,
                'rs_model_decommiss_date', rs_model_decommiss_date,
                'remove_decision', remove_decision,
                'ds_department', ds_department,
                'assignment_contractor', assignment_contractor,
                'developing_start_date', developing_start_date,
                'developing_end_date', developing_end_date,
                'data_source_description', data_source_description,
                'target', target,
                'calibration_method', calibration_method,
                'developing_report', developing_report,
                'name_and_version_rating_system', name_and_version_rating_system,
                'version_it_implementation', version_it_implementation,
                'responsible_subdivision_and_project_lead_for_it_implementation', responsible_subdivision_and_project_lead_for_it_implementation,
                'date_of_it_introduction_into_operation', date_of_it_introduction_into_operation,
                'psi_protocol', psi_protocol,
                'validation_department', validation_department,
                'plan_validation_type', plan_validation_type,
                'validation_period', validation_period,
                'validation_report_approve_date', validation_report_approve_date,
                'validation_result', NULL,
                'validation_result_approve_date', validation_result_approve_date,
                'auto_validation_result', auto_validation_result,
                'importance_changes', importance_changes,
                'approve_importance', approve_importance,
                'approve_importance_changes', approve_importance_changes,
                'date_and_number_regulator_notification', date_and_number_regulator_notification,
                'date_submission_to_regulator', date_submission_to_regulator,
                'decision_date_and_number_of_application_model_for_segment', NULL,
                'notification_date_and_number_of_application_model_for_segment', NULL,
                'decision_date_and_number_of_application_model', NULL,
                'notification_date_and_number_of_application_model', NULL,
                'start_date_of_application_model_approved_regulator', start_date_of_application_model_approved_regulator
              )
            )
          WHEN $1 = 2 THEN
            jsonb_build_object(
              'user_id', NULL,
              'isOwner', FALSE,
              'public', TRUE,
              'template_id', 2,
              'template_name', 'Реестр действующих моделей в соответствии с ПУМР',
              'template_value',
              jsonb_build_object(
                'system_model_id', system_model_id,
                'update_date', update_date,
                'group_company', group_company,
                'model_name_validation', model_name_validation,
                'model_id', model_id,
                'model_version', model_version,
                'model_type', model_type,
                'model_risk_type', model_risk_type,
                'model_desc', model_desc,
                'implementation_segment', implementation_segment,
                'business_customer', business_customer,
                'business_customer_departament', business_customer_departament,
                'significance_validity', significance_validity,
                'responsible_for_significance_validity', responsible_for_significance_validity,
                'implementation_validity', implementation_validity,
                'validity_approve', validity_approve,
                'rs_model_decommiss_date', rs_model_decommiss_date,
                'remove_decision', remove_decision,
                'model_changes_info', model_changes_info,
                'ds_department', ds_department,
                'developing_report', developing_report,
                'developing_end_date', developing_end_date,
                'validation_report_approve_date', validation_report_approve_date,
                'validation_result', validation_result,
                'validation_result_approve_date', validation_result_approve_date,
                'auto_validation_result', auto_validation_result,
                'active_model', active_model
              )
            )
          ELSE NULL
          END AS template_json
      FROM filtered_models
      WHERE
        ($1 = 1 AND record_id IS NOT NULL) -- Для ПУРС (template_id=1): фильтр по record_id IS NOT NULL
         OR ($1 = 2 AND active_model = '1') -- Для ПУМР (template_id=2): фильтр по active_model = '1'
         OR $1 NOT IN (1, 2); -- Для других template_id (если понадобится в будущем)
    `
  }

  private extractRowsFromResult(result: any): any[] {
    if (Array.isArray(result)) {
      return result
    }

    if (result && typeof result === 'object') {
      if (result.rows && Array.isArray(result.rows)) {
        return result.rows
      }

      const arrayKeys = Object.keys(result).filter(key => Array.isArray(result[key]))
      if (arrayKeys.length > 0) {
        return result[arrayKeys[0]]
      }
    }

    throw new ReportGenerationError('Некорректный формат ответа от базы данных')
  }
}
