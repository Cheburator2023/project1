import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'
import { MODEL_STATUS } from 'src/system/common/constants/model-status'
import { PimUsageService } from 'src/modules/pim-usage/pim-usage.service'
import { UsageService } from 'src/modules/usage/usage.service'
import { MODEL_SOURCES } from 'src/system/common/constants/models.constants'
import {
  QuarterInfoDto,
  ConfirmationModelRow,
  SaveQuarterlyConfirmationDto,
  GetModelsQueryDto
} from './dto/quarterly-confirmation.dto'
import { UpdateUsageResult } from 'src/modules/usage/dto'
import { ModelsService } from 'src/modules/models/models.service'
import { BUSINESS_CUSTOMER_DEPARTMENT_MAPPING } from 'src/modules/models/constants/departments.contants'

@Injectable()
export class QuarterlyConfirmationService {
  private parseUsageFlag(raw: unknown): boolean | null {
    if (raw == null) return null
    const v = String(raw).trim().toLowerCase()
    if (!v) return null
    if (['да', 'yes', '1', 'true'].includes(v)) return true
    if (['нет', 'no', '0', 'false'].includes(v)) return false
    return null
  }

  /** Выражение для сравнения без лишних пробелов в `business_customer`. */
  private static businessCustomerNormalizedSql(): string {
    return `regexp_replace(trim(COALESCE(a.business_customer,'')), '[[:space:]]+', ' ', 'g')`
  }

  private static normalizeWhitespace(s: string): string {
    return String(s || '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  /** Первое слово (фамилия без отчества и т.п., если в токене они разделены пробелом). */
  private static firstNameToken(s: string): string {
    const n = QuarterlyConfirmationService.normalizeWhitespace(s)
    if (!n) return ''
    const parts = n.split(/\s+/).filter(Boolean)
    return parts[0] ?? ''
  }

  /**
   * Для сегмента группы Keycloak после хвоста пути добавляем варианты из матрицы департаментов,
   * чтобы ИЛИ совпадало с полным названием в артефакте и с подразделениями из справочника.
   */
  private expandDepartmentLikePatterns(groupSegment: string): string[] {
    const t = QuarterlyConfirmationService.normalizeWhitespace(groupSegment)
    if (!t) return []
    const patterns = new Set<string>([`%${t}%`])
    const m = BUSINESS_CUSTOMER_DEPARTMENT_MAPPING as Record<string, string[]>
    const direct = m[t]
    if (direct) {
      for (const v of direct) {
        patterns.add(`%${QuarterlyConfirmationService.normalizeWhitespace(v)}%`)
      }
    }
    for (const [key, vals] of Object.entries(m)) {
      if (vals.includes(t)) {
        patterns.add(`%${key}%`)
        for (const v of vals) patterns.add(`%${v}%`)
      }
    }
    return [...patterns]
  }

  constructor(
    private readonly databaseService: MrmDatabaseService,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly logger: LoggerService,
    private readonly pimUsageService: PimUsageService,
    private readonly usageService: UsageService,
    private readonly modelsService: ModelsService
  ) {}

  getActiveQuarter(): QuarterInfoDto | null {
    const now = new Date()
    const currentYear = now.getFullYear()
    const activeQuarter = {
      quarter: Math.floor(now.getMonth() / 3) + 1,
      year: currentYear
    }

    const startDate = new Date(
      activeQuarter.year,
      (activeQuarter.quarter - 1) * 3,
      1
    )
    const endDate = new Date(activeQuarter.year, activeQuarter.quarter * 3, 0)
    const maxDate = new Date(
      activeQuarter.year,
      activeQuarter.quarter * 3 + 1,
      0
    )

    const result = {
      quarter: activeQuarter.quarter,
      year: activeQuarter.year,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      maxDate: maxDate.toISOString().split('T')[0]
    }

    this.logger.info(
      '[ALLOC_DEBUG] Active quarter selected',
      'ОтладкаВыбранногоАктивногоКвартала',
      result
    )

    return result
  }

  async getModelsForConfirmation(
    userFamilyName: string,
    userGivenName: string,
    userDepartment: string,
    filters?: GetModelsQueryDto
  ): Promise<ConfirmationModelRow[]> {
    const quarterInfo = this.getActiveQuarter()

    if (!quarterInfo) {
      return []
    }

    this.logger.info(
      'Getting models for quarterly confirmation',
      'ПолучениеМоделейДляПодтвержденияКвартала',
      {
        userFamilyName,
        userGivenName,
        userDepartment,
        quarter: quarterInfo.quarter,
        year: quarterInfo.year
      }
    )

    try {
      // Строим динамический SQL запрос с фильтрами
      // Поля business_customer (artefact_id=2031), business_customer_departament (artefact_id=2032),
      // фильтр «не архив / не ошибка заведения» — по строке артефакта 2656 (delete_status / business_status
      // в данных реестра), НЕ по вычисляемому model_status BPMN на карточке merge.
      // model_alias из root_model_id+version; model_name_dadm — 2096 + model_name_dadm custom_type.
      this.logger.info(
        '[ALLOC_DEBUG] getModelsForConfirmation filter params',
        'ОтладкаПараметровФильтрации',
        { userFamilyName, userGivenName, userDepartment }
      )

      const whereClauses: string[] = []
      const queryParams: Record<string, unknown> = {
        status_archive: MODEL_STATUS.ARCHIVE,
        status_creation_error: MODEL_STATUS.CREATION_ERROR
      }

      // Мэтчинг владельца: нормализация пробелов; полное ФИО из токена; первые слова (отчество в модели допустимо);
      // порядок «Фамилия Имя» и «Имя Фамилия» через OR (ИЛИ-группа).
      const bcNorm =
        QuarterlyConfirmationService.businessCustomerNormalizedSql()

      const family =
        QuarterlyConfirmationService.normalizeWhitespace(userFamilyName)
      const given =
        QuarterlyConfirmationService.normalizeWhitespace(userGivenName)
      const family1 =
        QuarterlyConfirmationService.firstNameToken(userFamilyName)
      const given1 = QuarterlyConfirmationService.firstNameToken(userGivenName)

      if (family || given) {
        const nameOrs: string[] = []
        if (family && given) {
          nameOrs.push(
            `(${bcNorm} ILIKE :bc_full_f AND ${bcNorm} ILIKE :bc_full_g)`
          )
          queryParams.bc_full_f = `%${family}%`
          queryParams.bc_full_g = `%${given}%`
          if (family1 !== family || given1 !== given) {
            nameOrs.push(
              `(${bcNorm} ILIKE :bc_tok_f AND ${bcNorm} ILIKE :bc_tok_g)`
            )
            queryParams.bc_tok_f = `%${family1}%`
            queryParams.bc_tok_g = `%${given1}%`
          }
          nameOrs.push(`(${bcNorm} ILIKE :bc_order_fg)`)
          queryParams.bc_order_fg = `%${family}%${given}%`
          nameOrs.push(`(${bcNorm} ILIKE :bc_order_gf)`)
          queryParams.bc_order_gf = `%${given}%${family}%`
        } else if (family) {
          nameOrs.push(`${bcNorm} ILIKE :bc_single_f`)
          queryParams.bc_single_f = `%${family}%`
          if (family1 && family1 !== family) {
            nameOrs.push(`${bcNorm} ILIKE :bc_single_f1`)
            queryParams.bc_single_f1 = `%${family1}%`
          }
        } else if (given) {
          nameOrs.push(`${bcNorm} ILIKE :bc_single_g`)
          queryParams.bc_single_g = `%${given}%`
          if (given1 && given1 !== given) {
            nameOrs.push(`${bcNorm} ILIKE :bc_single_g1`)
            queryParams.bc_single_g1 = `%${given1}%`
          }
        }
        if (nameOrs.length > 0) {
          whereClauses.push(`(${nameOrs.join(' OR ')})`)
        }
      }

      if (userDepartment) {
        const deptPatterns = this.expandDepartmentLikePatterns(userDepartment)
        const deptOrs = deptPatterns.map((_, idx) => {
          const key = `dept_bc_${idx}`
          queryParams[key] = deptPatterns[idx]
          return `a.business_customer_departament ILIKE :${key}`
        })
        if (deptOrs.length > 0) {
          whereClauses.push(`(${deptOrs.join(' OR ')})`)
        }
      }
      whereClauses.push(
        "trim(both FROM COALESCE(a.business_status, '')) NOT IN (:status_archive, :status_creation_error)",
        '(m.temp_block_flag != 1 OR m.temp_block_flag IS NULL)'
      )

      // Добавляем текстовый поиск
      if (filters?.search) {
        whereClauses.push(
          `(
            a.model_id ILIKE :search
            OR a.model_alias ILIKE :search
            OR m.model_name ILIKE :search
            OR a.model_name_dadm ILIKE :search
          )`
        )
        queryParams.search = `%${filters.search}%`
      }

      // Добавляем фильтры по атрибутам
      if (filters?.model_alias) {
        whereClauses.push('a.model_alias ILIKE :model_alias')
        queryParams.model_alias = `%${filters.model_alias}%`
      }

      if (filters?.model_name) {
        whereClauses.push('m.model_name ILIKE :model_name')
        queryParams.model_name = `%${filters.model_name}%`
      }

      if (filters?.model_name_dadm) {
        whereClauses.push('a.model_name_dadm ILIKE :model_name_dadm')
        queryParams.model_name_dadm = `%${filters.model_name_dadm}%`
      }

      if (filters?.business_customer) {
        whereClauses.push('a.business_customer ILIKE :business_customer')
        queryParams.business_customer = `%${filters.business_customer}%`
      }

      if (filters?.business_customer_departament) {
        whereClauses.push(
          'a.business_customer_departament ILIKE :business_customer_departament'
        )
        queryParams.business_customer_departament = `%${filters.business_customer_departament}%`
      }

      // model_source не является артефактом — это признак базы данных (СУМ/СУРМ),
      // поэтому изначально возвращаем 'sum-rm' для всех моделей из models_new
      // (база СУРМ), а ниже по ID проверим присутствие в БД СУМ и переопределим
      // на 'sum' для тех, которые реально заведены в СУМ (аналогично merge в
      // ModelsService.getModels / ModelMergeService).
      const sqlQuery = `
        SELECT DISTINCT
          a.system_model_id,
          a.model_id,
          a.model_alias,
          m.model_name,
          '${MODEL_SOURCES.MRM}' AS model_source,
          a.model_name_dadm,
          a.business_customer,
          a.business_customer_departament
        FROM models_new m
        LEFT JOIN (
          SELECT
            m2.model_id                                                                                        AS system_model_id,
            MAX(CASE WHEN ar.artefact_id = 2001 THEN ar.artefact_string_value ELSE NULL END)                  AS model_id,
            CAST('model' || m2.root_model_id AS varchar) || '-v' || CAST(m2.model_version AS varchar)         AS model_alias,
            MAX(CASE WHEN ar.artefact_id = 2096 OR trim(both FROM COALESCE(ar.artefact_custom_type, '')) = 'model_name_dadm'
                THEN ar.artefact_string_value ELSE NULL END)                                                 AS model_name_dadm,
            MAX(CASE WHEN ar.artefact_id = 2031 THEN ar.artefact_string_value ELSE NULL END)                  AS business_customer,
            STRING_AGG(CASE WHEN ar.artefact_id = 2032 THEN av.artefact_value ELSE NULL END, ',' ORDER BY ar.artefact_value_id) AS business_customer_departament,
            MAX(CASE WHEN ar.artefact_id = 2656 THEN ar.artefact_string_value ELSE NULL END)                  AS business_status
          FROM artefact_realizations_new ar
          INNER JOIN models_new m2 ON ar.model_id = m2.model_id
          LEFT JOIN artefact_values av ON ar.artefact_value_id = av.artefact_value_id AND av.is_active_flg = '1'
          WHERE ar.effective_to = TIMESTAMP '9999-12-31 23:59:59'
          GROUP BY m2.model_id, m2.root_model_id, m2.model_version
        ) a ON m.model_id = a.system_model_id
        WHERE ${whereClauses.join(' AND ')}
          AND a.model_id IS NOT NULL
        ORDER BY a.model_id
      `

      const models = await this.databaseService.query(sqlQuery, queryParams)

      if (models.length === 0) {
        return []
      }

      const systemModelIds = models.map((m) => m.system_model_id)

      this.logger.info(
        '[ALLOC_DEBUG] Models fetched from DB (before prefill)',
        'ОтладкаМоделиИзБД',
        {
          totalModels: models.length,
          sampleSystemModelIds: systemModelIds.slice(0, 5)
        }
      )

      // Определяем источник модели по наличию записи в БД СУМ.
      // Логика аналогична ModelsService.getModels / ModelMergeService:
      // если system_model_id присутствует в sum.models — считаем model_source='sum'.
      const sumModelRows: { model_id: string }[] = await this.sumDatabaseService
        .query(
          `
            SELECT model_id
            FROM models
            WHERE model_id::text = ANY(:system_model_ids)
          `,
          { system_model_ids: systemModelIds }
        )
        .catch((err) => {
          this.logger.warn(
            'Failed to resolve model_source from SUM db, defaulting to sum-rm',
            'НеУдалосьОпределитьModelSourceИзСУМ',
            { error: err instanceof Error ? err.message : String(err) }
          )
          return [] as { model_id: string }[]
        })
      const sumModelIdSet = new Set(sumModelRows.map((r) => String(r.model_id)))
      for (const m of models) {
        if (sumModelIdSet.has(String(m.system_model_id))) {
          m.model_source = MODEL_SOURCES.SUM
        }
      }

      this.logger.info(
        '[ALLOC_DEBUG] model_source resolved via SUM db lookup',
        'ОтладкаОпределенияИсточникаМодели',
        {
          totalModels: models.length,
          sumCount: sumModelIdSet.size,
          mrmCount: models.length - sumModelIdSet.size
        }
      )

      // Получаем данные из ПИМ
      const pimUsages = await this.pimUsageService.getPimUsageForModels(
        systemModelIds,
        quarterInfo.quarter,
        quarterInfo.year
      )
      const pimUsageMap = new Map(
        pimUsages.map((p) => [String(p.system_model_id), p])
      )

      this.logger.info(
        '[ALLOC_DEBUG] PIM usage data loaded',
        'ОтладкаДанныхПИМ',
        {
          pimUsageCount: pimUsages.length,
          pimSystemModelIds: pimUsages.map((p) => p.system_model_id),
          quarter: quarterInfo.quarter,
          year: quarterInfo.year
        }
      )

      // Получаем данные из предыдущего квартала
      const prevQuarter =
        quarterInfo.quarter === 1
          ? { quarter: 4, year: quarterInfo.year - 1 }
          : { quarter: quarterInfo.quarter - 1, year: quarterInfo.year }

      const prevUsages: {
        system_model_id: string
        is_used: boolean
        confirmation_date: string
      }[] = await this.databaseService.query(
        `
          SELECT model_id::text AS system_model_id,
                 is_used,
                 confirmation_date::text AS confirmation_date
          FROM models_usage
          WHERE model_id::text = ANY(:system_model_ids)
            AND confirmation_quarter = :quarter
            AND confirmation_year = :year
          `,
        {
          system_model_ids: systemModelIds,
          quarter: prevQuarter.quarter,
          year: prevQuarter.year
        }
      )

      const prevFlagLabel = `usage_confirm_flag_q${prevQuarter.quarter}`
      const prevDateLabel = `usage_confirm_date_q${prevQuarter.quarter}`

      /** Fallback: на главной usage мог сохраниться в артефактах до появления строки models_usage или при рассинхроне */
      const prevFromArtefacts: {
        system_model_id: string
        flag_raw: string | null
        confirmation_date: string | null
      }[] = await this.databaseService.query(
        `
          SELECT
            ar.model_id::text AS system_model_id,
            MAX(
              CASE
                WHEN COALESCE(a.artefact_tech_label, ar.artefact_custom_type) = :prev_flag_label
                THEN TRIM(ar.artefact_string_value)
              END
            ) AS flag_raw,
            MAX(
              CASE
                WHEN COALESCE(a.artefact_tech_label, ar.artefact_custom_type) = :prev_date_label
                THEN TRIM(ar.artefact_string_value)
              END
            ) AS confirmation_date
          FROM artefact_realizations_new ar
          LEFT JOIN artefacts a ON ar.artefact_id = a.artefact_id
          WHERE ar.model_id::text = ANY(:system_model_ids)
            AND ar.effective_to = TIMESTAMP '9999-12-31 23:59:59'
            AND COALESCE(a.artefact_tech_label, ar.artefact_custom_type)
              IN (:prev_flag_label, :prev_date_label)
          GROUP BY ar.model_id
        `,
        {
          system_model_ids: systemModelIds,
          prev_flag_label: prevFlagLabel,
          prev_date_label: prevDateLabel
        }
      )

      const prevUsageMap = new Map(
        prevUsages.map((u) => [String(u.system_model_id), u])
      )
      const prevArtefactMap = new Map(
        prevFromArtefacts.map((u) => {
          const parsed = this.parseUsageFlag(u.flag_raw)
          return [
            String(u.system_model_id),
            { is_used: parsed, confirmation_date: u.confirmation_date }
          ] as [
            string,
            { is_used: boolean | null; confirmation_date: string | null }
          ]
        })
      )

      this.logger.info(
        '[ALLOC_DEBUG] Previous quarter usage data loaded',
        'ОтладкаДанныхПредыдущегоКвартала',
        {
          prevUsageCount: prevUsages.length,
          prevArtefactsCount: prevFromArtefacts.length,
          prevSystemModelIds: prevUsages.map((u) => u.system_model_id),
          prevQuarter: prevQuarter.quarter,
          prevYear: prevQuarter.year
        }
      )

      // Получаем текущие данные за активный квартал
      const currentUsages: {
        system_model_id: string
        is_used: boolean
        confirmation_date: string
      }[] = await this.databaseService.query(
        `
          SELECT model_id::text AS system_model_id,
                 is_used,
                 confirmation_date::text AS confirmation_date
          FROM models_usage
          WHERE model_id::text = ANY(:system_model_ids)
            AND confirmation_quarter = :quarter
            AND confirmation_year = :year
          `,
        {
          system_model_ids: systemModelIds,
          quarter: quarterInfo.quarter,
          year: quarterInfo.year
        }
      )
      const currentUsageMap = new Map(
        currentUsages.map((u) => [String(u.system_model_id), u])
      )

      this.logger.info(
        '[ALLOC_DEBUG] Current quarter usage data loaded',
        'ОтладкаДанныхТекущегоКвартала',
        {
          currentUsageCount: currentUsages.length,
          currentSystemModelIds: currentUsages.map((u) => u.system_model_id)
        }
      )

      const today = new Date().toISOString().split('T')[0]

      let results = models.map((model) => {
        const sid = String(model.system_model_id)
        const currentUsage = currentUsageMap.get(sid)
        const pimUsage = pimUsageMap.get(sid)
        const prevRow = prevUsageMap.get(sid)
        const prevArt = prevArtefactMap.get(sid)
        const prevUsage =
          prevRow ??
          (prevArt && typeof prevArt.is_used === 'boolean'
            ? {
                system_model_id: sid,
                is_used: prevArt.is_used,
                confirmation_date: prevArt.confirmation_date ?? ''
              }
            : null)

        /** Есть сохранённые в БД признак/дата за прошлый квартал (таблица или артефакты). */
        const hasPrevQuarterData =
          Boolean(prevRow) ||
          Boolean(
            prevArt &&
              (typeof prevArt.is_used === 'boolean' ||
                (prevArt.confirmation_date != null &&
                  String(prevArt.confirmation_date).trim() !== ''))
          )

        // Если уже есть данные за текущий квартал, используем их
        if (currentUsage) {
          let prefillSource: 'pim' | 'previous_quarter' | null = null
          if (pimUsage) prefillSource = 'pim'
          else if (hasPrevQuarterData) prefillSource = 'previous_quarter'

          return {
            system_model_id: model.system_model_id,
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
            model_source: model.model_source,
            model_name_dadm: model.model_name_dadm,
            business_customer: model.business_customer,
            business_customer_departament: model.business_customer_departament,
            confirmation_date: currentUsage.confirmation_date
              ? new Date(currentUsage.confirmation_date)
                  .toISOString()
                  .split('T')[0]
              : today,
            is_used: currentUsage.is_used,
            prefill_source: prefillSource
          }
        }

        // Приоритет предзаполнения: ПИМ > предыдущий квартал > пусто
        if (pimUsage) {
          return {
            system_model_id: model.system_model_id,
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
            model_source: model.model_source,
            model_name_dadm: model.model_name_dadm,
            business_customer: model.business_customer,
            business_customer_departament: model.business_customer_departament,
            confirmation_date: today,
            is_used: pimUsage.is_used,
            prefill_source: 'pim' as const
          }
        }

        if (typeof prevUsage?.is_used === 'boolean') {
          return {
            system_model_id: model.system_model_id,
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
            model_source: model.model_source,
            model_name_dadm: model.model_name_dadm,
            business_customer: model.business_customer,
            business_customer_departament: model.business_customer_departament,
            confirmation_date: today,
            is_used: prevUsage.is_used,
            prefill_source: 'previous_quarter' as const
          }
        }

        return {
          system_model_id: model.system_model_id,
          model_id: model.model_id,
          model_alias: model.model_alias,
          model_name: model.model_name,
          model_source: model.model_source,
          model_name_dadm: model.model_name_dadm,
          business_customer: model.business_customer,
          business_customer_departament: model.business_customer_departament,
          confirmation_date: today,
          is_used: null,
          prefill_source: null
        }
      })

      const prefillStats = {
        pim: results.filter((r) => r.prefill_source === 'pim').length,
        previous_quarter: results.filter(
          (r) => r.prefill_source === 'previous_quarter'
        ).length,
        no_data: results.filter((r) => r.prefill_source === null).length
      }

      this.logger.info(
        '[ALLOC_DEBUG] Prefill priority results',
        'ОтладкаРезультатовПриоритетовПредзаполнения',
        {
          total: results.length,
          prefillStats,
          sampleResults: results.slice(0, 3).map((r) => ({
            model_id: r.model_id,
            prefill_source: r.prefill_source,
            is_used: r.is_used,
            confirmation_date: r.confirmation_date
          }))
        }
      )

      // Применяем фильтры на стороне приложения для полей, которые не в models_registry
      if (filters?.prefill_source) {
        if (filters.prefill_source === 'none') {
          results = results.filter((r) => r.prefill_source === null)
        } else {
          results = results.filter(
            (r) => r.prefill_source === filters.prefill_source
          )
        }
      }

      if (filters?.is_used !== undefined) {
        results = results.filter((r) => r.is_used === filters.is_used)
      }

      /** Без фильтра по группам: список моделей уже ограничен SQL; иначе несовпадение строк департаментов даёт пустой registry_card. */
      const registryMap =
        await this.modelsService.getRegistryCardsBySystemModelIds(
          results.map((r) => r.system_model_id),
          {},
          undefined
        )

      return results.map((r): ConfirmationModelRow => {
        const card = registryMap.get(String(r.system_model_id))
        const flat = card
          ? (JSON.parse(JSON.stringify(card)) as Record<string, unknown>)
          : null
        return {
          ...r,
          registry_card: flat
        }
      })
    } catch (error) {
      this.logger.error(
        'Error getting models for confirmation',
        'ОшибкаПолученияМоделейДляПодтверждения',
        error,
        { userFamilyName, userGivenName, userDepartment }
      )
      throw error
    }
  }

  async saveConfirmation(
    data: SaveQuarterlyConfirmationDto,
    creator: string
  ): Promise<{
    success: boolean
    quarter: number
    year: number
    totalInPayload: number
    savedToMrm: number
    syncedToSum: number
    sumSyncErrors: { system_model_id: string; error: string }[]
    models: {
      system_model_id: string
      is_used: boolean | null
      confirmation_date: string | null
      mrm: boolean
      sum: boolean | null
    }[]
  }> {
    this.logger.info(
      'Saving quarterly confirmation',
      'СохранениеПодтвержденияКвартала',
      {
        quarter: data.quarter,
        year: data.year,
        modelsCount: data.models.length
      }
    )

    try {
      const modelsToSave = data.models.filter(
        (m) => m.is_used !== null && m.is_used !== undefined
      )

      this.logger.info(
        '[ALLOC_DEBUG] Models to save (filtered non-null is_used)',
        'ОтладкаМоделейДляСохранения',
        {
          totalInPayload: data.models.length,
          filteredToSave: modelsToSave.length,
          models: modelsToSave.map((m) => ({
            system_model_id: m.system_model_id,
            confirmation_date: m.confirmation_date,
            is_used: m.is_used
          }))
        }
      )

      const saveResults: {
        system_model_id: string
        is_used: boolean | null
        confirmation_date: string | null
        mrm: boolean
        sum: boolean | null
      }[] = []
      const sumSyncErrors: { system_model_id: string; error: string }[] = []
      let syncedToSum = 0

      for (const model of modelsToSave) {
        this.logger.info(
          '[ALLOC_DEBUG] Saving model usage via artefact flow',
          'ОтладкаСохраненияМоделиЧерезАртефакты',
          {
            system_model_id: model.system_model_id,
            quarter: data.quarter,
            year: data.year,
            confirmation_date: model.confirmation_date,
            is_used: model.is_used,
            creator
          }
        )

        // usage.service.ts ожидает model_id в DTO — это UUID из models_new (как и колонка model_id в models_usage).
        const usageArtefacts = [
          {
            model_id: model.system_model_id,
            artefact_tech_label: `usage_confirm_date_q${data.quarter}`,
            artefact_string_value: model.confirmation_date
              ? this.formatDateToDDMMYYYY(model.confirmation_date)
              : this.formatDateToDDMMYYYY(
                  new Date().toISOString().split('T')[0]
                ),
            artefact_value_id: null,
            creator
          },
          {
            model_id: model.system_model_id,
            artefact_tech_label: `usage_confirm_flag_q${data.quarter}`,
            artefact_string_value: model.is_used ? 'Да' : 'Нет',
            artefact_value_id: null,
            creator
          }
        ]

        const usageUpdateResult: UpdateUsageResult =
          await this.usageService.updateUsage(
            usageArtefacts,
            MODEL_SOURCES.MRM,
            {
              syncLinkedSum: true
            }
          )

        const mrmUpdateResult = usageUpdateResult.sources[MODEL_SOURCES.MRM]
        const sumUpdateResult = usageUpdateResult.sources[MODEL_SOURCES.SUM]

        let sumSynced: boolean | null = sumUpdateResult.attempted
          ? sumUpdateResult.updated
          : false

        if (sumUpdateResult.updated) {
          syncedToSum++
          this.logger.info(
            'Usage synced to SUM for model',
            'ИспользованиеСинхронизированоВСУМ',
            { system_model_id: model.system_model_id, quarter: data.quarter }
          )
        }

        if (sumUpdateResult.error) {
          // Ошибка синхронизации в СУМ не должна блокировать основное сохранение
          sumSynced = null
          sumSyncErrors.push({
            system_model_id: model.system_model_id,
            error: sumUpdateResult.error
          })
          this.logger.warn(
            'Failed to sync usage to SUM, MRM save succeeded',
            'ОшибкаСинхронизацииВСУМСохранениеВМРМУспешно',
            {
              system_model_id: model.system_model_id,
              quarter: data.quarter,
              error: sumUpdateResult.error
            }
          )
        }

        saveResults.push({
          system_model_id: model.system_model_id,
          is_used: model.is_used,
          confirmation_date: model.confirmation_date,
          mrm: mrmUpdateResult.updated,
          sum: sumSynced
        })
      }

      const savedToMrm = saveResults.filter((result) => result.mrm).length

      this.logger.info(
        '[ALLOC_DEBUG] Quarterly confirmation saved successfully',
        'ПодтверждениеКварталаУспешноСохранено',
        {
          quarter: data.quarter,
          year: data.year,
          savedCount: savedToMrm,
          syncedToSum,
          sumSyncErrors: sumSyncErrors.length
        }
      )

      return {
        success: true,
        quarter: data.quarter,
        year: data.year,
        totalInPayload: data.models.length,
        savedToMrm,
        syncedToSum,
        sumSyncErrors,
        models: saveResults
      }
    } catch (error) {
      this.logger.error(
        'Error saving quarterly confirmation',
        'ОшибкаСохраненияПодтвержденияКвартала',
        error,
        { quarter: data.quarter, year: data.year }
      )
      throw error
    }
  }

  private formatDateToDDMMYYYY(dateStr: string): string {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  }
}
