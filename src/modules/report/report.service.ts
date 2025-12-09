import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  CACHE_MANAGER,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { Cache } from 'cache-manager'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsService } from 'src/modules/models/models.service'
import { ExcelService } from 'src/excel/excel.service'
import { MetricsAggregator } from 'src/modules/metrics/aggregators'

import {
  Model,
  Artefact,
  ArtefactTypeEnum,
  ArtefactTypeId
} from 'src/modules/models/interfaces'

import { MetricsEnum } from 'src/modules/metrics/enums'
import { getDefaultModelRiskForReport } from 'src/modules/models/utils/model-risk.utils'
import { isValidDate, parseDate } from 'src/system/common/utils'
import * as crypto from 'crypto'
import { LoggerService } from 'src/system/logger/logger.service'

type FilterModel = {
  [key: string]: SetFilter | DateFilter
}

type SetFilter = {
  values: (string | null)[]
  filterType: string
}

type DateFilter = {
  dateFrom: string
  dateTo: string
  filterType: string
  type: string
}

type Preset = {
  key: string
  title: string
  type: string
}

@Injectable()
export class ReportService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly modelsService: ModelsService,
    private readonly metricsAggregator: MetricsAggregator,
    private readonly excelService: ExcelService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async exportMetricToExcel(
    metric: MetricsEnum,
    startDate: string | null,
    endDate: string | null,
    streams: string[],
    useDatamart: boolean,
    dataType?: string
  ): Promise<Buffer> {
    const rawData = await this.metricsAggregator.getRawData(
      metric,
      startDate,
      endDate,
      streams,
      useDatamart,
      dataType
    )

    // Для delta данных пустой результат - это нормально
    if (!rawData || rawData.length === 0) {
      if (dataType === 'delta') {
        // Для delta возвращаем пустой Excel файл с динамическими заголовками
        // Получаем заголовки из первой строки данных или используем базовые
        const headers =
          rawData && rawData.length > 0
            ? Object.keys(rawData[0]).map((key) => ({
                key,
                title: key,
                type:
                  typeof rawData[0][key] === 'number'
                    ? 'number'
                    : ('string' as any)
              }))
            : [
                {
                  key: 'system_model_id',
                  title: 'system_model_id',
                  type: 'string'
                },
                { key: 'ds_stream', title: 'ds_stream', type: 'string' },
                { key: 'period', title: 'period', type: 'string' }
              ]

        return this.excelService.createExcel({
          headers,
          body: []
        })
      } else {
        throw new NotFoundException('Нет данных для экспорта')
      }
    }

    const headers = Object.keys(rawData[0]).map((key) => ({
      key,
      title: key,
      type: typeof rawData[0][key] === 'number' ? 'number' : ('string' as any)
    }))

    return this.excelService.createExcel({ headers, body: rawData })
  }

  async getReport(
    filters: FilterModel | { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<Buffer> {
    const legacyFilters = this.convertFiltersToLegacyFormat(filters)
    const reportData: { headers: Preset[]; body: Model[] } =
      await this.generateReportData(legacyFilters, groups, mode, reportDate)
    const xlsxBuffer: Buffer = await this.generateExcel(reportData)

    return xlsxBuffer
  }

  /**
   * Получить JSON отчет
   */
  async getJsonReport(
    template_id?: number,
    date?: string,
    groups?: string[]
  ): Promise<{ [key: string]: any[] }> {
    // Валидация template_id
    if (template_id && ![1, 2].includes(template_id)) {
      throw new HttpException(
        {
          error: {
            code: '400',
            message: 'Неверно указан template_id/дата'
          }
        },
        HttpStatus.BAD_REQUEST
      )
    }

    // Проверка аутентификации пользователя
    if (!groups || groups.length === 0) {
      this.logger.warn('Попытка доступа без аутентификации или с пустыми группами')
    }

    // Формируем ключ для кэширования
    const cacheKey = this.getJsonReportCacheKey(template_id, date, groups)

    this.logger.info('Executing Json report', 'Выполнение отчёта JSON')

    // Проверяем кэш
    const cachedResult = await this.cacheManager.get(cacheKey)
    if (cachedResult) {
      return cachedResult as { [key: string]: any[] }
    }

    // Формируем дату отчета
    let reportDate: Date
    if (date) {
      reportDate = parseDate(date)
      if (!reportDate) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверно указан template_id/дата'
            }
          },
          HttpStatus.BAD_REQUEST
        )
      }
    } else {
      reportDate = new Date()
    }

    const formattedDate = reportDate.toISOString().split('T')[0]

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
      await this.cacheManager.set(cacheKey, result, 300000)

      this.logger.info('Report has been sent', 'Отчёт отправлен')

      return result
    } catch (error) {
      this.logger.error('Ошибка при формировании JSON отчета:', error)

      // Проверяем, является ли ошибка ошибкой аутентификации
      if (error.message && (
        error.message.includes('authentication') ||
        error.message.includes('auth') ||
        error.message.includes('401')
      )) {
        throw new HttpException(
          {
            error: {
              code: '401',
              message: 'Некорректная пара логин - пароль'
            }
          },
          HttpStatus.UNAUTHORIZED
        )
      }

      // Проверяем, является ли ошибка ошибкой шаблона
      if (error.message && (
        error.message.includes('template') ||
        error.message.includes('Шаблон') ||
        error.message.includes('template_id')
      )) {
        throw new HttpException(
          {
            error: {
              code: '400',
              message: 'Неверно указан template_id/дата'
            }
          },
          HttpStatus.BAD_REQUEST
        )
      }

      // Проверяем, является ли ошибка ошибкой базы данных
      if (error.message && (
        error.message.includes('SQL') ||
        error.message.includes('database') ||
        error.message.includes('базы данных')
      )) {
        throw new HttpException(
          {
            error: {
              code: '503',
              message: 'Сервис недоступен'
            }
          },
          HttpStatus.SERVICE_UNAVAILABLE
        )
      }

      throw new HttpException(
        {
          error: {
            code: '503',
            message: 'Сервис недоступен'
          }
        },
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }
  }

  /**
   * Получить отчет по шаблону с использованием оптимизированного SQL-запроса
   */
  private async getReportByTemplate(
    template_id: number,
    date: string
  ): Promise<{ [key: string]: any[] }> {
    try {
      // Используем предоставленный SQL-запрос с подготовленным выражением
      const query = `
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

      const result = await this.mrmDatabaseService.query(query, [template_id, date])

      // Проверка результата запроса
      if (!result) {
        this.logger.error('SQL-запрос вернул пустой результат')
        throw new Error('Не удалось получить данные из базы данных')
      }

      if (!result.rows) {
        this.logger.error('SQL-запрос не содержит rows:', result)
        throw new Error('Некорректный формат ответа от базы данных')
      }

      // Проверка, что rows является массивом
      if (!Array.isArray(result.rows)) {
        this.logger.error('Rows не является массивом:', typeof result.rows)
        throw new Error('Некорректный тип данных в ответе от базы данных')
      }

      // Извлекаем template_value из результатов с дополнительной проверкой
      const data = result.rows
        .filter(row => {
          // Проверка на существование row и его свойств
          if (!row || row.template_json === null || row.template_json === undefined) {
            return false
          }
          return row.template_json.template_value !== null && row.template_json.template_value !== undefined
        })
        .map(row => row.template_json.template_value)

      // Формируем структуру ответа согласно ТЗ
      return {
        [`reports_${date}`]: data
      }

    } catch (error) {
      this.logger.error('Ошибка при выполнении SQL-запроса для шаблона:', error)

      // Проверяем, является ли ошибка ошибкой синтаксиса SQL
      if (error.message && error.message.includes('syntax error') || error.message.includes('SQL')) {
        this.logger.error('Ошибка синтаксиса SQL в запросе для шаблона:', template_id)
        throw new Error('Ошибка в SQL-запросе. Пожалуйста, проверьте синтаксис запроса.')
      }

      // Проверяем, является ли ошибка ошибкой подключения к БД
      if (error.message && (error.message.includes('connection') || error.message.includes('database'))) {
        this.logger.error('Ошибка подключения к базе данных для шаблона:', template_id)
        throw new Error('Ошибка подключения к базе данных. Сервис временно недоступен.')
      }

      // Перебрасываем ошибку дальше для обработки в getJsonReport
      throw error
    }
  }

  /**
   * Сгенерировать ключ для кэширования JSON отчетов
   */
  private getJsonReportCacheKey(
    template_id?: number,
    date?: string,
    groups?: string[]
  ): string {
    const templateKey = template_id ? template_id.toString() : 'all'
    const dateKey = date || 'current'
    const groupsHash = groups && groups.length > 0
      ? crypto.createHash('md5').update(groups.sort().join(',')).digest('hex')
      : 'no_groups'

    return `report_json:${templateKey}:${dateKey}:${groupsHash}`
  }

  private async generateReportData(
    filters: { [key: string]: string[] },
    groups?: [],
    mode?: string[],
    reportDate?: string
  ): Promise<{ headers: Preset[]; body: Model[] }> {
    if (!Object.keys(filters).length) {
      throw new BadRequestException(
        'Bad Request',
        'filter object cannot be empty'
      )
    }

    const artefacts: Artefact[] = await this.modelsService.getArtefactLabels()

    const headers = this.generateReportHeaders(artefacts)
    const sortedHeaders = this.sortHeadersByFilters(headers, filters)

    const models: Model[] = await this.modelsService.getModels({ mode }, groups)
    const filteredModels = this.filterModels(models, artefacts, filters)

    // Проверяем, является ли это отчётом "Расчёт модельного риска"
    const isModelRiskReport = mode?.includes('model_risk_calculation')

    if (isModelRiskReport) {
      // Только автозаполнение КМР по умолчанию (100%), без расчётов устаревания и сегмента
      filteredModels.forEach((model) => {
        const kmr = getDefaultModelRiskForReport(model.model_risk_coefficient)
        model.model_risk_coefficient = String(kmr)
      })
    }

    return {
      headers: sortedHeaders,
      body: filteredModels
    }
  }

  private filterModels(
    models: Model[],
    artefacts: Artefact[],
    filters: { [key: string]: string[] }
  ): any[] {
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

  private applyFilter(
    artefactValue,
    filterValues,
    artefactType: ArtefactTypeId
  ): boolean {
    const hasNullInFilter = filterValues.includes(null)
    const isValueEmpty = ReportService.filterByEmpty(artefactValue)

    if (!hasNullInFilter && isValueEmpty) {
      return false
    }

    if (hasNullInFilter && isValueEmpty) {
      return true
    }

    switch (artefactType) {
      case ArtefactTypeEnum.DATE:
      case ArtefactTypeEnum.QUARTERLY_DATE:
        return ReportService.filterByDate(artefactValue, filterValues)
      case ArtefactTypeEnum.BOOLEAN:
        return ReportService.filterByBoolean(artefactValue, filterValues)
      case ArtefactTypeEnum.TEXT:
      case ArtefactTypeEnum.DROPDOWN:
      case ArtefactTypeEnum.MULTI_DROPDOWN:
      case ArtefactTypeEnum.QUARTERLY_DROPDOWN:
      case ArtefactTypeEnum.PERCENTAGE:
        return ReportService.filterByString(artefactValue, filterValues)
      default:
        return false
    }
  }

  private static filterByDate(artefactValue, filterValues): boolean {
    if (!filterValues || filterValues.length !== 2) {
      return false
    }

    if (
      !isValidDate(artefactValue) ||
      !isValidDate(filterValues[0]) ||
      !isValidDate(filterValues[1])
    ) {
      return false
    }

    const artefactDate = new Date(artefactValue)
    const startDate = new Date(filterValues[0])
    const endDate = new Date(filterValues[1])

    return artefactDate >= startDate && artefactDate <= endDate
  }

  private static filterByBoolean(artefactValue, filterValues): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByString(artefactValue, filterValues): boolean {
    return filterValues.includes(artefactValue)
  }

  private static filterByEmpty(artefactValue): boolean {
    return (
      artefactValue === null ||
      artefactValue === undefined ||
      artefactValue === ''
    )
  }

  private mapArtefactsByKey(artefacts: Artefact[]): {
    [key: string]: Artefact
  } {
    return artefacts.reduce((acc, artefact) => {
      acc[artefact.artefact_tech_label] = artefact
      return acc
    }, {})
  }

  async generateExcel(data): Promise<Buffer> {
    return this.excelService.createExcel(data)
  }

  private sortHeadersByFilters(headers, filters) {
    return Object.keys(filters)
      .map((filterKey) => headers.find((header) => header.key === filterKey))
      .filter(Boolean)
  }

  private convertFiltersToLegacyFormat(
    filters: FilterModel | { [key: string]: string[] }
  ): { [key: string]: string[] } {
    if (this.isLegacyFormat(filters)) {
      return filters as { [key: string]: string[] }
    }

    const filterModel = filters as FilterModel
    const legacyFilters: { [key: string]: string[] } = {}

    Object.keys(filterModel).forEach((key) => {
      const filter = filterModel[key]

      if (filter.filterType === 'set') {
        const setFilter = filter as SetFilter
        legacyFilters[key] = setFilter.values.map((v) =>
          v === null ? null : String(v)
        )
      } else if (filter.filterType === 'date') {
        const dateFilter = filter as DateFilter
        legacyFilters[key] = [dateFilter.dateFrom, dateFilter.dateTo]
      }
    })

    return legacyFilters
  }

  private isLegacyFormat(
    filters: FilterModel | { [key: string]: string[] }
  ): boolean {
    const firstKey = Object.keys(filters)[0]
    if (!firstKey) return true

    const firstValue = filters[firstKey]
    return Array.isArray(firstValue)
  }

  private generateReportHeaders(artefacts: Artefact[]): Preset[] {
    const artefactHeaders = artefacts.map(
      ({ artefact_tech_label, artefact_label, artefact_type_desc }) => ({
        key: artefact_tech_label,
        title: artefact_label,
        type: artefact_type_desc
      })
    )

    return artefactHeaders
  }
}
