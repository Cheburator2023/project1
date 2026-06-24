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

/** Строка реестра для аллокации до обогащения prefill/registry_card. */
type AllocationCandidateModel = {
  system_model_id: string
  model_id: string
  model_alias: string | null
  model_name: string | null
  model_source: string
  model_name_dadm: string | null
  business_customer: string | null
  business_customer_departament: string | null
}

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

  /**
   * Источник статуса предзаполнения (подпись «Перенесено из ПИМ» / «из Qn»).
   * В `pimUsage` уже объединены ПИМ за активный квартал и за предыдущий (приоритет у активного).
   * При одновременном наличии ПИМ и данных SURM за предыдущий квартал приоритет у ПИМ.
   */
  private resolveAllocationPrefillSource(
    pimUsage: { is_used: boolean } | undefined,
    hasPrevQuarterData: boolean
  ): 'pim' | 'previous_quarter' | null {
    if (pimUsage != null) return 'pim'
    if (hasPrevQuarterData) return 'previous_quarter'
    return null
  }

  private isExcludedAllocationBusinessStatus(
    businessStatus: string | null | undefined
  ): boolean {
    const status = String(businessStatus ?? '').trim()
    return (
      status === MODEL_STATUS.ARCHIVE || status === MODEL_STATUS.CREATION_ERROR
    )
  }

  private applyAllocationQueryFilters(
    candidates: AllocationCandidateModel[],
    filters?: GetModelsQueryDto
  ): AllocationCandidateModel[] {
    let result = candidates

    const ilikeIncludes = (
      value: string | null | undefined,
      needle: string | undefined
    ): boolean => {
      if (!needle) return true
      return String(value ?? '')
        .toLowerCase()
        .includes(needle.toLowerCase())
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      result = result.filter((m) =>
        [m.model_id, m.model_alias, m.model_name, m.model_name_dadm].some((f) =>
          String(f ?? '')
            .toLowerCase()
            .includes(search)
        )
      )
    }

    if (filters?.model_alias) {
      result = result.filter((m) => ilikeIncludes(m.model_alias, filters.model_alias))
    }
    if (filters?.model_name) {
      result = result.filter((m) => ilikeIncludes(m.model_name, filters.model_name))
    }
    if (filters?.model_name_dadm) {
      result = result.filter((m) =>
        ilikeIncludes(m.model_name_dadm, filters.model_name_dadm)
      )
    }
    if (filters?.business_customer) {
      result = result.filter((m) =>
        ilikeIncludes(m.business_customer, filters.business_customer)
      )
    }
    if (filters?.business_customer_departament) {
      result = result.filter((m) =>
        ilikeIncludes(
          m.business_customer_departament,
          filters.business_customer_departament
        )
      )
    }

    return [...result].sort((a, b) =>
      String(a.model_id ?? '').localeCompare(String(b.model_id ?? ''), 'ru')
    )
  }

  /**
   * Тот же набор моделей, что на главной (`ModelsService.getModels` + merge СУМ/СУРМ
   * и {@link ModelsService.filterModelsByUserGroups} по всем группам Keycloak).
   */
  private async fetchAllocationCandidatesFromMergedRegistry(
    userGroups: string[],
    filters?: GetModelsQueryDto
  ): Promise<{
    models: AllocationCandidateModel[]
    sumModelIdSet: Set<string>
  }> {
    const merged = await this.modelsService.getModels(
      { ignoreModeFilter: true },
      userGroups.length > 0 ? userGroups : undefined
    )
    const candidates: AllocationCandidateModel[] = []
    const sumModelIdSet = new Set<string>()

    for (const model of merged) {
      const systemModelId = String(model.system_model_id ?? '').trim()
      const modelId = String(model.model_id ?? '').trim()
      if (!systemModelId || !modelId) continue

      if (this.isExcludedAllocationBusinessStatus(model.business_status)) continue

      const modelSource =
        model.model_source === MODEL_SOURCES.SUM
          ? MODEL_SOURCES.SUM
          : MODEL_SOURCES.MRM

      if (modelSource === MODEL_SOURCES.SUM) {
        sumModelIdSet.add(systemModelId)
      }

      candidates.push({
        system_model_id: systemModelId,
        model_id: modelId,
        model_alias: model.model_alias ?? null,
        model_name: model.model_name ?? null,
        model_source: modelSource,
        model_name_dadm: model.model_name_dadm ?? model.model_name ?? null,
        business_customer: model.business_customer ?? null,
        business_customer_departament: model.business_customer_departament ?? null
      })
    }

    return {
      models: this.applyAllocationQueryFilters(candidates, filters),
      sumModelIdSet
    }
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

  /**
   * Если подтверждение прошло только в БД СУМ (`model_usage_confirm`), в СУРМ строки в
   * `models_usage` может не быть — тогда дополняем карту источников для предзаполнения.
   */
  private async augmentPrevUsageFromSum(
    sumModelIds: Set<string>,
    prevQuarter: { quarter: number; year: number },
    prevUsageMap: Map<
      string,
      {
        system_model_id: string
        is_used: boolean | null
        confirmation_date: string
      }
    >
  ): Promise<void> {
    const ids = [...sumModelIds].filter((id) => !prevUsageMap.has(id))
    if (ids.length === 0) {
      return
    }

    try {
      const rows: {
        system_model_id: string
        is_used: boolean | null
        confirmation_date: string | null
      }[] = await this.sumDatabaseService.query(
        `
        SELECT model_id::text AS system_model_id,
               CASE
                 WHEN confirmed IS NULL THEN NULL
                 WHEN confirmed = true THEN true
                 ELSE false
               END AS is_used,
               confirmation_date::text AS confirmation_date
        FROM model_usage_confirm
        WHERE model_id::text = ANY(:system_model_ids)
          AND quarter = :quarter
          AND CAST(confirmation_year AS INTEGER) = CAST(:year AS INTEGER)
        `,
        {
          system_model_ids: ids,
          quarter: prevQuarter.quarter,
          year: prevQuarter.year
        }
      )

      let added = 0
      for (const r of rows) {
        const sid = String(r.system_model_id)
        if (!sumModelIds.has(sid)) {
          continue
        }
        if (prevUsageMap.has(sid)) {
          continue
        }
        const dateStr =
          r.confirmation_date != null ? String(r.confirmation_date).trim() : ''
        const hasSignal =
          typeof r.is_used === 'boolean' || dateStr.length > 0
        if (!hasSignal) {
          continue
        }
        prevUsageMap.set(sid, {
          system_model_id: sid,
          is_used: typeof r.is_used === 'boolean' ? r.is_used : null,
          confirmation_date: dateStr
        })
        added += 1
      }

      this.logger.info(
        '[ALLOC_DEBUG] SUM model_usage_confirm merged for prev quarter',
        'ОтладкаСлиянияПодтвержденияИзСУМ',
        {
          queriedIds: ids.length,
          matchedRows: rows.length,
          mergedIntoPrevUsageMap: added,
          prevQuarter: prevQuarter.quarter,
          prevYear: prevQuarter.year
        }
      )
    } catch (err) {
      this.logger.warn(
        '[ALLOC_DEBUG] Failed to load SUM prev-quarter usage — skipping merge',
        'ПропускЧтенияПрошлогоКварталаИзСУМ',
        { error: err instanceof Error ? err.message : String(err) }
      )
    }
  }

  /** ФИО (`userFamilyName`, `userGivenName`) после ПСИ не участвуют в фильтре — сохранены для совместимости API. */
  async getModelsForConfirmation(
    _userFamilyName: string,
    _userGivenName: string,
    userGroups: string[],
    preferredUsername: string,
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
        userGroups,
        preferredUsername,
        quarter: quarterInfo.quarter,
        year: quarterInfo.year
      }
    )

    try {
      this.logger.info(
        '[ALLOC_DEBUG] getModelsForConfirmation filter params',
        'ОтладкаПараметровФильтрации',
        { userGroups, preferredUsername }
      )

      const { models, sumModelIdSet } =
        await this.fetchAllocationCandidatesFromMergedRegistry(userGroups, filters)

      if (models.length === 0) {
        return []
      }

      const systemModelIds = models.map((m) => m.system_model_id)

      this.logger.info(
        '[ALLOC_DEBUG] Models fetched from merged registry (before prefill)',
        'ОтладкаМоделиИзОбъединённогоРеестра',
        {
          totalModels: models.length,
          sumCount: sumModelIdSet.size,
          mrmCount: models.length - sumModelIdSet.size,
          sampleSystemModelIds: systemModelIds.slice(0, 5)
        }
      )

      const prevQuarter =
        quarterInfo.quarter === 1
          ? { quarter: 4, year: quarterInfo.year - 1 }
          : { quarter: quarterInfo.quarter - 1, year: quarterInfo.year }

      // ПИМ за активный квартал и за предыдущий: иначе при ПИМ только за Q(n-1) и открытой аллокации Qn
      // статус ошибочно становится «Перенесено из Q(n-1)», хотя источник — ПИМ.
      const [pimUsages, pimUsagesPrevQuarter] = await Promise.all([
        this.pimUsageService.getPimUsageForModels(
          systemModelIds,
          quarterInfo.quarter,
          quarterInfo.year
        ),
        this.pimUsageService.getPimUsageForModels(
          systemModelIds,
          prevQuarter.quarter,
          prevQuarter.year
        )
      ])
      const pimUsageMap = new Map(
        pimUsages.map((p) => [String(p.system_model_id), p])
      )
      const pimUsagePrevQuarterMap = new Map(
        pimUsagesPrevQuarter.map((p) => [String(p.system_model_id), p])
      )

      this.logger.info(
        '[ALLOC_DEBUG] PIM usage data loaded',
        'ОтладкаДанныхПИМ',
        {
          pimUsageCount: pimUsages.length,
          pimSystemModelIds: pimUsages.map((p) => p.system_model_id),
          quarter: quarterInfo.quarter,
          year: quarterInfo.year,
          pimPrevQuarterCount: pimUsagesPrevQuarter.length,
          pimPrevQuarterModelIds: pimUsagesPrevQuarter.map(
            (p) => p.system_model_id
          ),
          prevQuarterForPim: prevQuarter.quarter,
          prevYearForPim: prevQuarter.year
        }
      )

      // Получаем данные из предыдущего квартала
      const prevUsages: {
        system_model_id: string
        is_used: boolean | null
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

      await this.augmentPrevUsageFromSum(sumModelIdSet, prevQuarter, prevUsageMap)

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
        const pimUsage =
          pimUsageMap.get(sid) ?? pimUsagePrevQuarterMap.get(sid)
        const prevRow = prevUsageMap.get(sid)
        const prevArt = prevArtefactMap.get(sid)
        const prevAnyDateFromRow =
          prevRow != null &&
          prevRow.confirmation_date != null &&
          String(prevRow.confirmation_date).trim() !== ''

        /** Есть сохранённые в БД признак и/или дата за прошлый квартал (таблица или артефакты).
         * Строка только с датой без is_used (например только в СУМ) — тоже считаем переносом, не «новая модель». */
        const hasPrevQuarterData =
          (prevRow != null &&
            (typeof prevRow.is_used === 'boolean' || prevAnyDateFromRow)) ||
          Boolean(
            prevArt &&
              (typeof prevArt.is_used === 'boolean' ||
                (prevArt.confirmation_date != null &&
                  String(prevArt.confirmation_date).trim() !== ''))
          )

        const prevCarriedIsUsed: boolean | null =
          typeof prevRow?.is_used === 'boolean'
            ? prevRow.is_used
            : typeof prevArt?.is_used === 'boolean'
              ? prevArt.is_used
              : null

        // Если уже есть данные за текущий квартал, используем их
        if (currentUsage) {
          const prefillSource = this.resolveAllocationPrefillSource(
            pimUsage,
            hasPrevQuarterData
          )

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

        // Значения и prefill_source: ПИМ > предыдущий квартал (см. resolveAllocationPrefillSource)
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

        if (hasPrevQuarterData) {
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
            is_used: prevCarriedIsUsed,
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
        { userGroups, preferredUsername }
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
