import { Injectable } from '@nestjs/common'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { LoggerService } from 'src/system/logger/logger.service'
import { canEditQuarter } from 'src/system/common/utils'
import {
  QUARTER_EDIT_PERIOD_MONTHS,
  QUARTER_EDIT_PERIOD_DAYS
} from 'src/system/common/constants'
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

@Injectable()
export class QuarterlyConfirmationService {
  constructor(
    private readonly databaseService: MrmDatabaseService,
    private readonly logger: LoggerService,
    private readonly pimUsageService: PimUsageService,
    private readonly usageService: UsageService
  ) {}

  getActiveQuarter(): QuarterInfoDto | null {
    const now = new Date()
    const currentYear = now.getFullYear()

    const editableQuarters: {
      quarter: number
      year: number
      daysLeft: number
    }[] = []

    for (let q = 1; q <= 4; q++) {
      // Проверяем текущий год
      if (canEditQuarter(q, currentYear)) {
        const endOfQuarter = new Date(currentYear, q * 3, 0, 23, 59, 59, 999)
        const gracePeriodEnd = this.addMonthsAndDays(
          endOfQuarter,
          QUARTER_EDIT_PERIOD_MONTHS,
          QUARTER_EDIT_PERIOD_DAYS
        )
        const daysLeft = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        editableQuarters.push({ quarter: q, year: currentYear, daysLeft })
      }

      // Проверяем предыдущий год (для Q4)
      if (q === 4 && canEditQuarter(4, currentYear - 1)) {
        const endOfQuarter = new Date(currentYear - 1, 12, 0, 23, 59, 59, 999)
        const gracePeriodEnd = this.addMonthsAndDays(
          endOfQuarter,
          QUARTER_EDIT_PERIOD_MONTHS,
          QUARTER_EDIT_PERIOD_DAYS
        )
        const daysLeft = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        editableQuarters.push({
          quarter: 4,
          year: currentYear - 1,
          daysLeft
        })
      }
    }

    this.logger.info(
      '[ALLOC_DEBUG] Editable quarters computed',
      'ОтладкаДоступныхКварталов',
      {
        now: now.toISOString(),
        editableQuarters,
        QUARTER_EDIT_PERIOD_MONTHS,
        QUARTER_EDIT_PERIOD_DAYS
      }
    )

    if (editableQuarters.length === 0) {
      this.logger.warn(
        'No editable quarters found',
        'НетДоступныхКварталов',
        {}
      )
      return null
    }

    // Выбираем квартал с наименьшим количеством оставшихся дней
    editableQuarters.sort((a, b) => a.daysLeft - b.daysLeft)
    const activeQuarter = editableQuarters[0]

    const startDate = new Date(
      activeQuarter.year,
      (activeQuarter.quarter - 1) * 3,
      1
    )
    const endDate = new Date(activeQuarter.year, activeQuarter.quarter * 3, 0)
    // Конец квартала + 1 месяц для ограничения выбора даты
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
      // business_status (artefact_id=2656), model_alias вычисляется из root_model_id+version
      // model_name_dadm = rating_system_name (artefact_id=2003)
      this.logger.info(
        '[ALLOC_DEBUG] getModelsForConfirmation filter params',
        'ОтладкаПараметровФильтрации',
        { userFamilyName, userGivenName, userDepartment }
      )

      // Матчим business_customer по обоим частям имени раздельно —
      // работает независимо от порядка ("Мазур Елена" или "Елена Мазур")
      const whereClauses: string[] = []
      const queryParams: any = {
        status_archive: MODEL_STATUS.ARCHIVE,
        status_creation_error: MODEL_STATUS.CREATION_ERROR
      }

      if (userFamilyName) {
        whereClauses.push('a.business_customer ILIKE :family_name_pattern')
        queryParams.family_name_pattern = `%${userFamilyName}%`
      }
      if (userGivenName) {
        whereClauses.push('a.business_customer ILIKE :given_name_pattern')
        queryParams.given_name_pattern = `%${userGivenName}%`
      }
      if (userDepartment) {
        whereClauses.push('a.business_customer_departament ILIKE :user_department')
        queryParams.user_department = `%${userDepartment}%`
      }
      whereClauses.push(
        "COALESCE(a.business_status, '') NOT IN (:status_archive, :status_creation_error)",
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

      const sqlQuery = `
        SELECT DISTINCT
          a.model_id,
          a.model_alias,
          m.model_name,
          a.model_name_dadm,
          a.business_customer,
          a.business_customer_departament
        FROM models_new m
        LEFT JOIN (
          SELECT
            m2.model_id                                                                                        AS system_model_id,
            MAX(CASE WHEN ar.artefact_id = 2001 THEN ar.artefact_string_value ELSE NULL END)                  AS model_id,
            CAST('model' || m2.root_model_id AS varchar) || '-v' || CAST(m2.model_version AS varchar)         AS model_alias,
            MAX(CASE WHEN ar.artefact_id = 2003 THEN ar.artefact_string_value ELSE NULL END)                  AS model_name_dadm,
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

      const modelIds = models.map((m) => m.model_id)

      this.logger.info(
        '[ALLOC_DEBUG] Models fetched from DB (before prefill)',
        'ОтладкаМоделиИзБД',
        {
          totalModels: models.length,
          sampleModelIds: modelIds.slice(0, 5)
        }
      )

      // Получаем данные из ПИМ
      const pimUsages = await this.pimUsageService.getPimUsageForModels(
        modelIds,
        quarterInfo.quarter,
        quarterInfo.year
      )
      const pimUsageMap = new Map(pimUsages.map((p) => [p.model_id, p]))

      this.logger.info(
        '[ALLOC_DEBUG] PIM usage data loaded',
        'ОтладкаДанныхПИМ',
        {
          pimUsageCount: pimUsages.length,
          pimModelIds: pimUsages.map((p) => p.model_id),
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
        model_id: string
        is_used: boolean
        confirmation_date: string
      }[] = await this.databaseService.query(
        `
          SELECT model_id, is_used, confirmation_date
          FROM models_usage
          WHERE model_id = ANY(:model_ids)
            AND confirmation_quarter = :quarter
            AND confirmation_year = :year
          `,
        {
          model_ids: modelIds,
          quarter: prevQuarter.quarter,
          year: prevQuarter.year
        }
      )
      const prevUsageMap = new Map(prevUsages.map((u) => [u.model_id, u]))

      this.logger.info(
        '[ALLOC_DEBUG] Previous quarter usage data loaded',
        'ОтладкаДанныхПредыдущегоКвартала',
        {
          prevUsageCount: prevUsages.length,
          prevModelIds: prevUsages.map((u) => u.model_id),
          prevQuarter: prevQuarter.quarter,
          prevYear: prevQuarter.year
        }
      )

      // Получаем текущие данные за активный квартал
      const currentUsages: {
        model_id: string
        is_used: boolean
        confirmation_date: string
      }[] = await this.databaseService.query(
        `
          SELECT model_id, is_used, confirmation_date
          FROM models_usage
          WHERE model_id = ANY(:model_ids)
            AND confirmation_quarter = :quarter
            AND confirmation_year = :year
          `,
        {
          model_ids: modelIds,
          quarter: quarterInfo.quarter,
          year: quarterInfo.year
        }
      )
      const currentUsageMap = new Map(currentUsages.map((u) => [u.model_id, u]))

      this.logger.info(
        '[ALLOC_DEBUG] Current quarter usage data loaded',
        'ОтладкаДанныхТекущегоКвартала',
        {
          currentUsageCount: currentUsages.length,
          currentModelIds: currentUsages.map((u) => u.model_id)
        }
      )

      const today = new Date().toISOString().split('T')[0]

      let results = models.map((model) => {
        const currentUsage = currentUsageMap.get(model.model_id)
        const pimUsage = pimUsageMap.get(model.model_id)
        const prevUsage = prevUsageMap.get(model.model_id)

        // Если уже есть данные за текущий квартал, используем их
        if (currentUsage) {
          let prefillSource: 'pim' | 'previous_quarter' | null = null
          if (pimUsage) prefillSource = 'pim'
          else if (prevUsage) prefillSource = 'previous_quarter'

          return {
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
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
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
            model_name_dadm: model.model_name_dadm,
            business_customer: model.business_customer,
            business_customer_departament: model.business_customer_departament,
            confirmation_date: today,
            is_used: pimUsage.is_used,
            prefill_source: 'pim' as const
          }
        }

        if (prevUsage) {
          return {
            model_id: model.model_id,
            model_alias: model.model_alias,
            model_name: model.model_name,
            model_name_dadm: model.model_name_dadm,
            business_customer: model.business_customer,
            business_customer_departament: model.business_customer_departament,
            confirmation_date: today,
            is_used: prevUsage.is_used,
            prefill_source: 'previous_quarter' as const
          }
        }

        return {
          model_id: model.model_id,
          model_alias: model.model_alias,
          model_name: model.model_name,
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

      return results
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
  ): Promise<boolean> {
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
            model_id: m.model_id,
            confirmation_date: m.confirmation_date,
            is_used: m.is_used
          }))
        }
      )

      for (const model of modelsToSave) {
        this.logger.info(
          '[ALLOC_DEBUG] Saving model usage via artefact flow',
          'ОтладкаСохраненияМоделиЧерезАртефакты',
          {
            model_id: model.model_id,
            quarter: data.quarter,
            year: data.year,
            confirmation_date: model.confirmation_date,
            is_used: model.is_used,
            creator
          }
        )

        await this.usageService.updateUsage(
          [
            {
              model_id: model.model_id,
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
              model_id: model.model_id,
              artefact_tech_label: `usage_confirm_flag_q${data.quarter}`,
              artefact_string_value: model.is_used ? 'Да' : 'Нет',
              artefact_value_id: null,
              creator
            }
          ],
          MODEL_SOURCES.MRM
        )
      }

      this.logger.info(
        '[ALLOC_DEBUG] Quarterly confirmation saved successfully',
        'ПодтверждениеКварталаУспешноСохранено',
        {
          quarter: data.quarter,
          year: data.year,
          savedCount: modelsToSave.length
        }
      )

      return true
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

  private addMonthsAndDays(date: Date, months: number, days: number): Date {
    const base = new Date(date.getTime())
    const targetMonth = base.getMonth() + months
    const targetYear = base.getFullYear() + Math.floor(targetMonth / 12)
    const newMonth = targetMonth % 12
    const currentDay = base.getDate()
    const daysInTargetMonth = new Date(targetYear, newMonth + 1, 0).getDate()
    const day = Math.min(currentDay, daysInTargetMonth)
    const shiftedDate = new Date(
      targetYear,
      newMonth,
      day,
      base.getHours(),
      base.getMinutes(),
      base.getSeconds(),
      base.getMilliseconds()
    )
    shiftedDate.setTime(shiftedDate.getTime() + days * 24 * 60 * 60 * 1000)
    return shiftedDate
  }
}
