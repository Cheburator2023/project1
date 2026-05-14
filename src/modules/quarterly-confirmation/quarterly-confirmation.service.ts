import { createHash } from 'crypto'
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
import { queryConvert } from 'src/system/common/utils'

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
   * Кого мэтчим с ФИО из Keycloak: арт. 2031 → арт. 2075 «подрядчик» → `models_new.model_creator`,
   * если заказчик в реестре ещё не заполнен.
   */
  private static allocationOwnerNormalizedSql(): string {
    return `regexp_replace(trim(COALESCE(
      NULLIF(trim(COALESCE(a.business_customer,'')), ''),
      NULLIF(trim(COALESCE(a.assignment_contractor,'')), ''),
      trim(COALESCE(m.model_creator,''))
    )), '[[:space:]]+', ' ', 'g')`
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

  /** Кириллическое ФИО → латиница (ILIKE регистронезависим, нужно для смешения с Keycloak latin). */
  private static latinForCyrillicRough(s: string): string {
    const src = QuarterlyConfirmationService.normalizeWhitespace(s)
    if (!src) return ''
    const multi: Array<[string, string]> = [
      ['щ', 'sch'],
      ['ш', 'sh'],
      ['ч', 'ch'],
      ['ж', 'zh'],
      ['ц', 'ts'],
      ['ю', 'yu'],
      ['я', 'ya'],
      ['ё', 'yo'],
      ['х', 'kh'],
      ['й', 'y'],
      ['ы', 'y'],
      ['э', 'e']
    ]
    const oneRu: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      и: 'i',
      з: 'z',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      ъ: '',
      ь: ''
    }
    let i = 0
    let out = ''
    const lower = src.toLowerCase()
    while (i < lower.length) {
      const rest = lower.slice(i)
      let step = 0
      let chunk = ''
      for (const [ru, lat] of multi) {
        if (rest.startsWith(ru)) {
          chunk = lat
          step = ru.length
          break
        }
      }
      if (!step) {
        const ch = lower[i]
        if (ch && Object.prototype.hasOwnProperty.call(oneRu, ch)) {
          chunk = oneRu[ch]
          step = 1
        } else {
          chunk = src[i]
          step = 1
        }
      }
      out += chunk
      i += step
    }
    return out
  }

  /** Латинское имя/фамилия → кириллица (простая схема; для Elena → елена). */
  private static cyrillicRoughFromLatinToken(s: string): string {
    const lower =
      QuarterlyConfirmationService.normalizeWhitespace(s).toLowerCase()
    if (!lower) return ''
    const multi: Array<[string, string]> = [
      ['shch', 'щ'],
      ['sch', 'щ'],
      ['sh', 'ш'],
      ['kh', 'х'],
      ['zh', 'ж'],
      ['ch', 'ч'],
      ['ts', 'ц'],
      ['yu', 'ю'],
      ['ya', 'я'],
      ['yo', 'ё']
    ]
    const lone: Record<string, string> = {
      a: 'а',
      b: 'б',
      c: 'к',
      d: 'д',
      e: 'е',
      f: 'ф',
      g: 'г',
      h: 'х',
      i: 'и',
      j: 'дж',
      k: 'к',
      l: 'л',
      m: 'м',
      n: 'н',
      o: 'о',
      p: 'п',
      q: 'к',
      r: 'р',
      s: 'с',
      t: 'т',
      u: 'у',
      v: 'в',
      w: 'в',
      x: 'кс',
      y: 'й',
      z: 'з'
    }
    let i = 0
    let out = ''
    while (i < lower.length) {
      if (!/[a-z]/i.test(lower[i])) {
        out += lower[i]
        i += 1
        continue
      }
      const rest = lower.slice(i)
      let step = 0
      let chunk = ''
      for (const [lt, ru] of multi) {
        if (rest.startsWith(lt)) {
          chunk = ru
          step = lt.length
          break
        }
      }
      if (!step) {
        chunk = lone[lower[i]] ?? lower[i]
        step = 1
      }
      out += chunk
      i += step
    }
    return out
  }

  /**
   * Варианты подстроки для ILIKE: как в токене + кирилл↔лат (Keycloak latin vs регистр 2031 кирил).
   */
  private static nameTokenSearchVariants(tok: string): string[] {
    const n = QuarterlyConfirmationService.normalizeWhitespace(tok)
    if (!n) return []
    const v = new Set<string>([n])
    const hasCyr = /[а-яё]/i.test(n)
    const hasLat = /[a-z]/i.test(n)
    if (hasCyr) {
      const L = QuarterlyConfirmationService.latinForCyrillicRough(n)
      if (L) v.add(L)
    }
    if (hasLat && !hasCyr) {
      const Cy = QuarterlyConfirmationService.cyrillicRoughFromLatinToken(n)
      if (Cy) v.add(Cy)
    }
    return [...v]
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
        userFamilyName,
        userGivenName,
        userDepartment,
        preferredUsername,
        quarter: quarterInfo.quarter,
        year: quarterInfo.year
      }
    )

    try {
      // Строим динамический SQL запрос с фильтрами
      // Поля business_customer (artefact_id=2031), business_customer_departament (арт. 2032: каталог и/или string),
      // фильтр «не архив / не ошибка заведения» — по строке артефакта 2656, НЕ по model_status BPMN merge.
      // Агрегат артефактов строится от models_new LEFT JOIN ar при текущем effective_to — модель не исчезает
      // из строки результатов только из‑за пустого join к реализациям.
      this.logger.info(
        '[ALLOC_DEBUG] getModelsForConfirmation filter params',
        'ОтладкаПараметровФильтрации',
        { userFamilyName, userGivenName, userDepartment, preferredUsername }
      )

      const whereClauses: string[] = []
      const queryParams: Record<string, unknown> = {
        status_archive: MODEL_STATUS.ARCHIVE,
        status_creation_error: MODEL_STATUS.CREATION_ERROR
      }

      // Мэтчинг владельца: нормализация пробелов; варианты токенов кирилл↔лат
      // (типично given_name=Elena latin, арт. 2031 «… Елена …»).
      const ownerNorm =
        QuarterlyConfirmationService.allocationOwnerNormalizedSql()

      const family =
        QuarterlyConfirmationService.normalizeWhitespace(userFamilyName)
      const given =
        QuarterlyConfirmationService.normalizeWhitespace(userGivenName)
      const family1 =
        QuarterlyConfirmationService.firstNameToken(userFamilyName)
      const given1 = QuarterlyConfirmationService.firstNameToken(userGivenName)

      const login =
        QuarterlyConfirmationService.normalizeWhitespace(preferredUsername)

      if (family || given) {
        const nameOrs: string[] = []
        let nameSeq = 0

        const nextNk = (): string => `bc_nm_${++nameSeq}`

        if (family && given) {
          const fVariants =
            QuarterlyConfirmationService.nameTokenSearchVariants(family)
          const gVariants =
            QuarterlyConfirmationService.nameTokenSearchVariants(given)
          for (const f of fVariants) {
            for (const g of gVariants) {
              const nk = nextNk()
              nameOrs.push(
                `(${ownerNorm} ILIKE CAST(:${nk}_f AS text) AND ${ownerNorm} ILIKE CAST(:${nk}_g AS text))`
              )
              queryParams[`${nk}_f`] = `%${f}%`
              queryParams[`${nk}_g`] = `%${g}%`
            }
          }
          if (family1 !== family || given1 !== given) {
            const fTok =
              QuarterlyConfirmationService.nameTokenSearchVariants(family1)
            const gTok =
              QuarterlyConfirmationService.nameTokenSearchVariants(given1)
            for (const f of fTok) {
              for (const g of gTok) {
                const nk = nextNk()
                nameOrs.push(
                  `(${ownerNorm} ILIKE CAST(:${nk}_f AS text) AND ${ownerNorm} ILIKE CAST(:${nk}_g AS text))`
                )
                queryParams[`${nk}_f`] = `%${f}%`
                queryParams[`${nk}_g`] = `%${g}%`
              }
            }
          }
          for (const f of fVariants) {
            for (const g of gVariants) {
              const nkFg = nextNk()
              nameOrs.push(`(${ownerNorm} ILIKE CAST(:${nkFg}_o AS text))`)
              queryParams[`${nkFg}_o`] = `%${f}%${g}%`
              const nkGf = nextNk()
              nameOrs.push(`(${ownerNorm} ILIKE CAST(:${nkGf}_o AS text))`)
              queryParams[`${nkGf}_o`] = `%${g}%${f}%`
            }
          }
        } else if (family) {
          for (const f of QuarterlyConfirmationService.nameTokenSearchVariants(
            family
          )) {
            const nk = nextNk()
            nameOrs.push(`${ownerNorm} ILIKE CAST(:${nk}_s AS text)`)
            queryParams[`${nk}_s`] = `%${f}%`
          }
          if (family1 !== family && family1) {
            for (const f of QuarterlyConfirmationService.nameTokenSearchVariants(
              family1
            )) {
              const nk = nextNk()
              nameOrs.push(`${ownerNorm} ILIKE CAST(:${nk}_s AS text)`)
              queryParams[`${nk}_s`] = `%${f}%`
            }
          }
        } else if (given) {
          for (const g of QuarterlyConfirmationService.nameTokenSearchVariants(
            given
          )) {
            const nk = nextNk()
            nameOrs.push(`${ownerNorm} ILIKE CAST(:${nk}_s AS text)`)
            queryParams[`${nk}_s`] = `%${g}%`
          }
          if (given1 !== given && given1) {
            for (const g of QuarterlyConfirmationService.nameTokenSearchVariants(
              given1
            )) {
              const nk = nextNk()
              nameOrs.push(`${ownerNorm} ILIKE CAST(:${nk}_s AS text)`)
              queryParams[`${nk}_s`] = `%${g}%`
            }
          }
        }
        if (login) {
          nameOrs.push(
            `(lower(trim(COALESCE(m.model_creator,''))) = lower(trim(CAST(:alloc_preferred_username AS text))) OR lower(trim(COALESCE(a.assignment_contractor,''))) = lower(trim(CAST(:alloc_preferred_username AS text))))`
          )
          queryParams.alloc_preferred_username = login
        }
        if (nameOrs.length > 0) {
          whereClauses.push(`(${nameOrs.join(' OR ')})`)
        }
      } else if (login) {
        whereClauses.push(
          `(lower(trim(COALESCE(m.model_creator,''))) = lower(trim(CAST(:alloc_preferred_username AS text))) OR lower(trim(COALESCE(a.assignment_contractor,''))) = lower(trim(CAST(:alloc_preferred_username AS text))))`
        )
        queryParams.alloc_preferred_username = login
      }

      if (userDepartment) {
        const deptPatterns = this.expandDepartmentLikePatterns(userDepartment)
        const deptOrs = deptPatterns.map((_, idx) => {
          const key = `dept_bc_${idx}`
          queryParams[key] = deptPatterns[idx]
          return `a.business_customer_departament ILIKE CAST(:${key} AS text)`
        })
        if (deptOrs.length > 0) {
          whereClauses.push(
            `((${deptOrs.join(
              ' OR '
            )}) OR trim(COALESCE(a.business_customer_departament,'')) = '')`
          )
        }
      }
      whereClauses.push(
        "trim(both FROM COALESCE(a.business_status, '')) NOT IN (CAST(:status_archive AS text), CAST(:status_creation_error AS text))",
        '(m.temp_block_flag != 1 OR m.temp_block_flag IS NULL)'
      )

      // Добавляем текстовый поиск
      if (filters?.search) {
        whereClauses.push(
          `(
            a.model_id ILIKE CAST(:search AS text)
            OR a.model_alias ILIKE CAST(:search AS text)
            OR m.model_name ILIKE CAST(:search AS text)
            OR a.model_name_dadm ILIKE CAST(:search AS text)
          )`
        )
        queryParams.search = `%${filters.search}%`
      }

      // Добавляем фильтры по атрибутам
      if (filters?.model_alias) {
        whereClauses.push('a.model_alias ILIKE CAST(:model_alias AS text)')
        queryParams.model_alias = `%${filters.model_alias}%`
      }

      if (filters?.model_name) {
        whereClauses.push('m.model_name ILIKE CAST(:model_name AS text)')
        queryParams.model_name = `%${filters.model_name}%`
      }

      if (filters?.model_name_dadm) {
        whereClauses.push('a.model_name_dadm ILIKE CAST(:model_name_dadm AS text)')
        queryParams.model_name_dadm = `%${filters.model_name_dadm}%`
      }

      if (filters?.business_customer) {
        whereClauses.push('a.business_customer ILIKE CAST(:business_customer AS text)')
        queryParams.business_customer = `%${filters.business_customer}%`
      }

      if (filters?.business_customer_departament) {
        whereClauses.push(
          'a.business_customer_departament ILIKE CAST(:business_customer_departament AS text)'
        )
        queryParams.business_customer_departament = `%${filters.business_customer_departament}%`
      }

      // model_source не является артефактом — это признак базы данных (СУМ/СУРМ),
      // поэтому изначально возвращаем 'sum-rm' для всех моделей из models_new
      // (база СУРМ), а ниже по ID проверим присутствие в БД СУМ и переопределим
      // на 'sum' для тех, которые реально заведены в СУМ (аналогично merge в
      // ModelsService.getModels / ModelMergeService).
      // Подзапрос агрегатов — от models_new LEFT JOIN артефактов: иначе INNER JOIN ar отбрасывает
      // модель целиком при отсутствии строк с effective_to «текущая» (или при рассинхроне литерала timestamp).
      // 2032: COALESCE каталога artefact_values и свободной строки artefact_string_value — иначе фильтр по
      // департаменту не видит значение, хотя оно есть в реализации.
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
            COALESCE(
              NULLIF(
                trim(
                  both
                  FROM
                  MAX(
                    CASE
                      WHEN ar.artefact_id = 2001 THEN ar.artefact_string_value
                      ELSE NULL
                    END
                  )
                ),
                ''
              ),
              CAST('model' || m2.root_model_id AS varchar) || '-v' || CAST(m2.model_version AS varchar)
            )                                                                                                 AS model_id,
            CAST('model' || m2.root_model_id AS varchar) || '-v' || CAST(m2.model_version AS varchar)         AS model_alias,
            MAX(CASE WHEN ar.artefact_id = 2096 OR trim(both FROM COALESCE(ar.artefact_custom_type, '')) = 'model_name_dadm'
                THEN ar.artefact_string_value ELSE NULL END)                                                 AS model_name_dadm,
            MAX(CASE WHEN ar.artefact_id = 2031 THEN ar.artefact_string_value ELSE NULL END)                  AS business_customer,
            MAX(CASE WHEN ar.artefact_id = 2075 THEN ar.artefact_string_value ELSE NULL END)                  AS assignment_contractor,
            COALESCE(
              NULLIF(
                STRING_AGG(
                  CASE WHEN ar.artefact_id = 2032 THEN av.artefact_value ELSE NULL END,
                  ',' ORDER BY ar.artefact_value_id
                ),
                ''
              ),
              MAX(CASE WHEN ar.artefact_id = 2032 THEN ar.artefact_string_value ELSE NULL END)
            )                                                                                                 AS business_customer_departament,
            MAX(CASE WHEN ar.artefact_id = 2656 THEN ar.artefact_string_value ELSE NULL END)                  AS business_status
          FROM models_new m2
          LEFT JOIN artefact_realizations_new ar
            ON ar.model_id = m2.model_id
            AND ar.effective_to = TO_TIMESTAMP('9999-12-31 23:59:59', 'YYYY-MM-DD HH24:MI:SS')
          LEFT JOIN artefact_values av ON ar.artefact_value_id = av.artefact_value_id AND av.is_active_flg = '1'
          GROUP BY m2.model_id, m2.root_model_id, m2.model_version
        ) a ON m.model_id = a.system_model_id
        WHERE ${whereClauses.join(' AND ')}
          AND a.model_id IS NOT NULL
        ORDER BY a.model_id
      `

      // Дубликат queryConvert с MrmDatabaseService: сверка $N и массива значений (ловит «сломанные» :param).
      const convPreview = queryConvert(sqlQuery, queryParams)
      const dollarMatches = convPreview.text.match(/\$\d+/g) ?? []
      const dollarIndices = dollarMatches.map((s) =>
        Number(s.replace(/^\$/, ''))
      )
      const maxPgPlaceholder = dollarIndices.length
        ? Math.max(...dollarIndices)
        : 0
      const bindPlaceholderMismatch =
        maxPgPlaceholder > convPreview.values.length
      const paramKeyStats = Object.keys(queryParams).reduce(
        (acc, k) => {
          if (k.startsWith('dept_bc_')) acc.dept_bc += 1
          else if (k.startsWith('bc_nm_')) acc.bc_nm += 1
          else acc.other += 1
          return acc
        },
        { dept_bc: 0, bc_nm: 0, other: 0 }
      )

      this.logger.info(
        '[ALLOC_DEBUG] quarterly models SQL bind (pre-execute)',
        'ОтладкаСвязыванияSQLКвартальногоСписка',
        {
          namedParamKeys: Object.keys(queryParams).length,
          pgValueSlots: convPreview.values.length,
          whereAndParts: whereClauses.length,
          paramKeyStats,
          convertedSqlCharLength: convPreview.text.length,
          maxPgPlaceholder,
          bindPlaceholderMismatch,
          sqlFingerprintSha256_16: createHash('sha256')
            .update(convPreview.text)
            .digest('hex')
            .slice(0, 16)
        }
      )

      if (bindPlaceholderMismatch) {
        this.logger.warn(
          '[ALLOC_DEBUG] PG $N exceeds bind array length — check queryConvert / :param names',
          'ПредупреждениеРасхожденияПлейсхолдеровSQL',
          {
            maxPgPlaceholder,
            pgValueSlots: convPreview.values.length
          }
        )
      }

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
