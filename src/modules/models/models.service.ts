import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef
} from '@nestjs/common'
import { MrmModelService, SumModelService } from './services'
import { AllocationService } from 'src/modules/allocation/allocation.service'
import { UsageService } from 'src/modules/usage/usage.service'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsCacheService } from './models-cache.service'

import { getModels as getSumModels } from './sql/sum'
import {
  getArtefacts as getSumRmArtefacts,
  getModel as getSumRmModel,
  getModels as getSumRmModels,
  getModelsByTypeAndParentId as getSumRmModelsByTypeAndParentId,
  updateModelAllocation as updateSumRmModelAllocation
} from './sql/sum-rm'

import {
  LIFE_CYCLE_STAGES,
  LIFE_CYCLE_STAGES_DESCRIPTION,
  MODEL_SOURCES,
  MODEL_STATUS,
  MODEL_DISPLAY_MODES
} from 'src/system/common/constants'
import {
  BUSINESS_CUSTOMER_DEPARTMENT_MAPPING,
  DEPARTMENT_TO_STREAM_MAPPING,
  pseudoArtefacts
} from './constants'
import {
  Artefact,
  ArtefactValue,
  GroupedResults,
  Model,
  ModelRelationsResponse,
  ModelType
} from './interfaces'
import { CompareModelsDto, ModelsDto, ModelWithRelationsDto } from './dto'
import { ArtefactFormatting, ArtefactFormattingType } from './rules'

import {
  formatDateTime,
  isValidDate,
  parseDate,
  canEditQuarter,
  generateModelAlias
} from 'src/system/common/utils'
import { ModelCreateDto } from 'src/api/dto/index.dto'
import { randomUUID } from 'crypto'
import { sql as parentSumRmModel } from 'src/api/sql/models/sum-rm/parent'
import { sql as createModel } from 'src/api/sql/models/sum-rm/create'
import { sql as newArtefacts } from 'src/api/sql/artefacts/new'
import { ModelEntity } from './entities'

interface ArtefactUpdateDto {
  artefact_tech_label: string
  artefact_string_value: string
  artefact_value_id: string | null
}

interface ModelsUpdateDto {
  model_id: string
  model_source?: MODEL_SOURCES
  artefacts: ArtefactUpdateDto[]
}

@Injectable()
export class ModelsService {
  constructor(
    private readonly sumModelService: SumModelService,
    private readonly mrmModelService: MrmModelService,
    private readonly artefactService: ArtefactService,
    private readonly allocationService: AllocationService,
    private readonly usageService: UsageService,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    @Inject(forwardRef(() => ModelsCacheService))
    private readonly modelsCacheService: ModelsCacheService
  ) {}

  async getModels(
    dto?: ModelsDto & { ignoreModeFilter?: boolean },
    groups?: string[]
  ): Promise<Model[]> {
    const {
      date = null,
      model_id = null,
      mode = null,
      ignoreModeFilter = false
    } = dto || {}

    // 1. Получение и объединение моделей из СУМ и МРМ
    const rawResults = await this.fetchAndMergeModels(date, model_id)

    // 2. Форматируем копии моделей
    const resultsWithFormatting = await this.formatResults(
      rawResults.map((model) => ({ ...model }))
    )

    // 3. Фильтрация по режиму эксплуатации (если не отключена)
    const filteredByMode = ignoreModeFilter
      ? resultsWithFormatting
      : this.filterModelsByDisplayMode(resultsWithFormatting, mode)

    // 4. Фильтрация по группам пользователя
    const filteredByGroups = groups?.length
      ? this.filterModelsByUserGroups(filteredByMode, groups)
      : filteredByMode

    return filteredByGroups
  }

  async getModelsByDates(
    { firstDate, secondDate }: CompareModelsDto,
    groups?: []
  ): Promise<{ data: { cards: GroupedResults } }> {
    const firstDateResults = await this.fetchAndMergeModels(firstDate, null)
    const secondDateResults = await this.fetchAndMergeModels(secondDate, null)

    const filteredFirstDateResults = groups
      ? this.filterModelsByUserGroups(firstDateResults, groups)
      : firstDateResults
    const filteredSecondDateResults = groups
      ? this.filterModelsByUserGroups(secondDateResults, groups)
      : secondDateResults

    const formattedFirstDateResults = await this.formatResults(
      filteredFirstDateResults
    )
    const formattedSecondDateResults = await this.formatResults(
      filteredSecondDateResults
    )

    const groupedResults = this.groupResultsByModelIdAndSource(
      formattedFirstDateResults,
      formattedSecondDateResults
    )

    return {
      data: {
        cards: groupedResults
      }
    }
  }

  async getModelWithRelations({
    model_id
  }: ModelWithRelationsDto): Promise<ModelRelationsResponse> {
    const mrmModel = await this.mrmDatabaseService.query(getSumRmModel, {
      model_id
    })

    const modelTypes: ModelType[] = await this.mrmDatabaseService.query(
      'SELECT * FROM model_types',
      {}
    )

    const modelTypeDict = this.createModelTypeDictionary(modelTypes)

    const modules = await this.mrmDatabaseService.query(
      getSumRmModelsByTypeAndParentId,
      {
        type_id: modelTypeDict.module,
        parent_model_id: model_id
      }
    )

    const calibrations = await this.mrmDatabaseService.query(
      getSumRmModelsByTypeAndParentId,
      {
        type_id: modelTypeDict.calibration,
        parent_model_id: model_id
      }
    )

    return {
      data: {
        card: {
          ...mrmModel.pop(),
          modules: [...modules],
          calibrations: [...calibrations]
        }
      }
    }
  }

  async modelCreate(artefacts: ModelCreateDto[], user) {
    const model_id = randomUUID()
    let model_version = '1'
    let addParentArtefactsQueryParams

    const parent_model_id_artefact = artefacts.find(
      (artefact) => artefact.artefact_tech_label === 'parent_model_id'
    )
    const parent_model_id = parent_model_id_artefact
      ? parent_model_id_artefact.artefact_string_value
      : undefined
    const model_name_artefact = artefacts.find(
      (artefact) => artefact.artefact_tech_label === 'model_name_validation'
    )
    const model_name = model_name_artefact
      ? model_name_artefact.artefact_string_value
      : undefined

    if (!model_name) {
      throw new BadRequestException('Bad Request', 'model_name is required')
    }

    if (parent_model_id) {
      // ищем родительскую модель
      const parentModels = await this.mrmDatabaseService.query(
        parentSumRmModel,
        { parent_model_id }
      )

      // находим версию родительской модели
      const { root_model_id, parent_model_version } = parentModels.reduce(
        (prev, curr) => {
          if (
            !prev.parent_model_version ||
            prev.parent_model_version < curr.parent_model_version
          )
            return curr
          return prev
        },
        {}
      )

      model_version = String(Number(parent_model_version) + 1)

      const parentArtefacts = await this.mrmDatabaseService.query(
        "SELECT * FROM artefact_realizations_new WHERE model_id = :parent_model_id  AND effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')",
        { parent_model_id }
      )

      addParentArtefactsQueryParams = parentArtefacts.map(
        ({ artefact_id, artefact_string_value, artefact_value_id }) => ({
          artefact_id,
          artefact_string_value,
          artefact_value_id,
          model_id,
          creator: user.username
        })
      )
    }

    const createModelQueryParams = {
      model_id,
      model_name,
      model_version,
      create_date: new Date(),
      update_date: new Date(),
      model_creator: user.username
    }
    const [newModel]: ModelEntity[] = await this.mrmDatabaseService.query(
      createModel,
      createModelQueryParams
    )

    if (addParentArtefactsQueryParams) {
      await this.mrmDatabaseService.queryAll(
        newArtefacts,
        addParentArtefactsQueryParams
      )
    }

    const artefactsForUpdate = [
      {
        artefact_tech_label: 'system_model_id',
        artefact_string_value: model_id,
        artefact_value_id: null
      },
      ...artefacts.filter(
        (artefact) => artefact.artefact_tech_label !== 'model_name'
      )
    ].map((artefact) => ({ ...artefact, model_id, creator: user.username }))

    const { ModelDefaultsService } = await import(
      './services/model-defaults.service'
    )
    const defaultsService = new ModelDefaultsService()
    const defaults = await defaultsService.applyDefaultsOnCreate(
      model_id,
      artefacts
    )
    artefactsForUpdate.push(
      ...(defaults as unknown as typeof artefactsForUpdate)
    )

    await this.executeDatabaseUpdates({ artefactsForUpdate }, MODEL_SOURCES.MRM)

    // Обновляем кеш и ждем завершения операции перед возвратом результата

    await this.modelsCacheService.forceUpdateCache()

    return this.getModels({ model_id, ignoreModeFilter: true })
  }

  async surrogateModelCreate(model_id: string): Promise<ModelEntity | null> {
    const modelSum: ModelEntity | null =
      await this.sumModelService.getModelById(model_id)

    if (!modelSum) {
      return null
    }

    const [newModel] = await this.mrmDatabaseService.query(
      `
      INSERT INTO models_new (
        root_model_id,
        model_id,
        model_name,
        model_version,
        create_date,
        update_date,
        model_creator
      ) 
      VALUES (
        :root_model_id,
        :model_id,
        :model_name,
        :model_version,
        :create_date,
        :update_date,
        :model_creator
      )
      RETURNING *;
      `,
      {
        root_model_id: modelSum.root_model_id,
        model_id: modelSum.model_id,
        model_name: modelSum.model_name,
        model_version: modelSum.model_version,
        create_date: modelSum.create_date,
        update_date: modelSum.update_date,
        model_creator: modelSum.model_creator
      }
    )

    return newModel
  }

  private filterModelsByDisplayMode(
    models: Model[],
    mode: string[] | null
  ): Model[] {
    // Определяем активные режимы эксплуатации (Архив, Ошибка заведения, Ожидает удаления)
    const activeModes = new Set(mode ?? [])
    const isArchiveMode = activeModes.has(MODEL_DISPLAY_MODES.ARCHIVE)
    const isCreationErrorMode = activeModes.has(
      MODEL_DISPLAY_MODES.CREATION_ERROR
    )
    const isPendingDeleteMode = activeModes.has(
      MODEL_DISPLAY_MODES.PENDING_DELETE
    )

    return models.filter((model) => {
      const { model_source, models_is_active_flg, business_status } = model

      // Вычисляем статус модели
      const isArchive =
        models_is_active_flg === '0' || business_status === MODEL_STATUS.ARCHIVE
      const isCreationError = business_status === MODEL_STATUS.CREATION_ERROR
      const isPendingDelete = business_status === MODEL_STATUS.PENDING_DELETE

      // 1. Показываем архивные модели из SUM, если включен режим Архив
      if (model_source === MODEL_SOURCES.SUM && isArchive && isArchiveMode)
        return true

      // 2. Показываем модели с ошибкой заведения и ожидающие удаления из MRM, если соответствующие режимы включены
      if (model_source === MODEL_SOURCES.MRM) {
        if (isCreationError && isCreationErrorMode) return true
        if (isPendingDelete && isPendingDeleteMode) return true
      }

      // 3. По-умолчанию: показываем, если модели активны и не находятся в статусах ошибка заведения и ожидает удаления
      const isActive = model_source === MODEL_SOURCES.SUM ? !isArchive : true // для моделей MRM активность не проверяется
      const isValidStatus = !isCreationError && !isPendingDelete

      return isActive && isValidStatus
    })
  }

  // Фильтрация моделей в зависимости от групп пользователя
  public filterModelsByUserGroups(
    models: Model[],
    userGroups: string[]
  ): Model[] {
    const formattedGroups = userGroups.map((group) => group.trim())

    // Если пользователь входит в группу /business_customer
    if (
      formattedGroups.some((group) =>
        group.startsWith('/departament_business_customer')
      )
    ) {
      // Собираем все департаменты пользователя в один массив
      const userDepartments = formattedGroups
        .flatMap((group) => {
          const key = group.split('/').pop() || ''
          return BUSINESS_CUSTOMER_DEPARTMENT_MAPPING[key] || []
        })
        .filter(Boolean)

      return models.filter((model) => {
        const modelDepartments = (model.business_customer_departament || '')
          .split(',')
          .map((dep) => dep.trim())

        return userDepartments.some((userDep) =>
          modelDepartments.includes(userDep)
        )
      })
    }

    // Если пользователь входит в группы /ds или /ds/ds_lead
    if (
      formattedGroups.includes('/ds') ||
      formattedGroups.includes('/ds/ds_lead')
    ) {
      // Извлекаем последние сегменты групп
      const userDepartments = formattedGroups
        .filter((group) => group.startsWith('/departament'))
        .map((group) => group.split('/').pop() || '')

      const userStreams = userDepartments.flatMap((department) => {
        return DEPARTMENT_TO_STREAM_MAPPING[department] || []
      })

      return models.filter((model) => {
        const modelStream = model.ds_stream

        return (
          userStreams.includes(modelStream) ||
          userDepartments.includes(modelStream)
        )
      })
    }

    return models
  }

  private isBasicInfoArtefact(label) {
    return [
      'model_id',
      'model_version',
      'model_alias',
      'model_status',
      'create_date'
    ].includes(label)
  }

  private isNameArtefact(label) {
    return label === 'model_name'
  }

  private isAllocationUsageArtefact(label) {
    return [
      'allocation_kib_usage',
      'allocation_smb_usage',
      'allocation_rb_usage',
      'allocation_kc_usage',
      'allocation_other_usage'
    ].includes(label)
  }

  private isAllocationCommentArtefact(label) {
    return [
      'allocation_kib_comment',
      'allocation_smb_comment',
      'allocation_rb_comment',
      'allocation_kc_comment',
      'allocation_other_comment'
    ].includes(label)
  }

  private isUsageArtefact(label) {
    return [
      'usage_confirm_date_q1',
      'usage_confirm_date_q2',
      'usage_confirm_date_q3',
      'usage_confirm_date_q4',
      'usage_confirm_flag_q1',
      'usage_confirm_flag_q2',
      'usage_confirm_flag_q3',
      'usage_confirm_flag_q4'
    ].includes(label)
  }

  async modelsUpdate(modelsArtefacts, user) {
    const creator = user.name

    let modelSource = MODEL_SOURCES.MRM
    const modelIds: Set<string> = new Set()
    const updatesBySource = {
      [MODEL_SOURCES.SUM]: {
        namesForUpdate: [],
        descriptionsForUpdate: [],
        artefactsForUpdate: [],
        modelsAllocationForUpdate: [],
        modelsUsageForUpdate: []
      },
      [MODEL_SOURCES.MRM]: {
        namesForUpdate: [],
        descriptionsForUpdate: [],
        artefactsForUpdate: [],
        modelsAllocationForUpdate: [],
        modelsUsageForUpdate: []
      }
    }
    const formattedModelsArtefacts = this.mergeArtefacts(modelsArtefacts)

    for (const modelItem of formattedModelsArtefacts) {
      const { model_id, artefacts, model_source } = modelItem
      modelIds.add(model_id)
      modelSource = model_source
      const updates = updatesBySource[model_source]

      // Trust the initial model_source value from the request
      // If model_source is 'sum', it means this model originally came from SUM
      const isOriginalSumModel = model_source === MODEL_SOURCES.SUM

      if (isOriginalSumModel) {
        const newModel: ModelEntity | null =
          await this.ensureSurrogateModelExists(model_id)

        if (newModel) {
          // Always ensure model_alias is updated for SUM models, regardless of current source
          updatesBySource[MODEL_SOURCES.MRM].artefactsForUpdate.push({
            model_id,
            artefact_tech_label: 'model_alias',
            artefact_string_value: generateModelAlias(
              newModel.root_model_id,
              newModel.model_version
            ),
            artefact_value_id: null,
            creator
          })
        }
      }

      for (const artefactItem of artefacts) {
        const { artefact_tech_label, artefact_string_value } = artefactItem

        if (this.isBasicInfoArtefact(artefact_tech_label)) {
          continue
        }

        if (this.isNameArtefact(artefact_tech_label)) {
          updates.namesForUpdate.push({
            model_id,
            model_name: artefact_string_value
          })
          if (isOriginalSumModel) {
            updatesBySource[MODEL_SOURCES.MRM].namesForUpdate.push({
              model_id,
              model_name: artefact_string_value
            })
          }
        } else if (this.isAllocationUsageArtefact(artefact_tech_label)) {
          updates.modelsAllocationForUpdate.push({
            model_id,
            gbl_id: this.getGblId(artefact_tech_label),
            percent: artefact_string_value,
            comment: null,
            creator
          })
        } else if (this.isAllocationCommentArtefact(artefact_tech_label)) {
          updates.modelsAllocationForUpdate.push({
            model_id,
            gbl_id: this.getGblId(artefact_tech_label),
            percent: null,
            comment: artefact_string_value,
            creator
          })
        } else if (this.isUsageArtefact(artefact_tech_label)) {
          updates.modelsUsageForUpdate.push({
            ...artefactItem,
            model_id,
            creator
          })
        } else {
          switch (artefact_tech_label) {
            case 'model_type':
            case 'significance_validity':
            case 'responsible_for_significance_validity':
            case 'segment_name':
            case 'implementation_segment':
            case 'developing_report':
            case 'data_source_description':
            case 'target':
            case 'psi_protocol':
            case 'validation_department':
            case 'plan_validation_type':
            case 'validation_period':
            case 'validation_report_approve_date':
            case 'validation_result':
            case 'validation_result_approve_date':
            case 'auto_validation_result':
            case 'model_changes_info':
            case 'model_desc':
            case 'rfd':
            case 'output_table':
            case 'allocation_assessment_class':
            case 'allocation_assessment_parameters':
              updatesBySource[MODEL_SOURCES.MRM].artefactsForUpdate.push({
                model_id,
                ...artefactItem,
                creator
              })
              continue
          }

          updates.artefactsForUpdate.push({
            model_id,
            ...artefactItem,
            creator
          })
          if (isOriginalSumModel) {
            updatesBySource[MODEL_SOURCES.MRM].artefactsForUpdate.push({
              model_id,
              ...artefactItem,
              creator
            })
          }
        }
      }
    }

    await this.executeDatabaseUpdates(
      updatesBySource[MODEL_SOURCES.SUM],
      MODEL_SOURCES.SUM
    )
    await this.executeDatabaseUpdates(
      updatesBySource[MODEL_SOURCES.MRM],
      MODEL_SOURCES.MRM
    )

    // Обновляем кеш и ждем завершения операции перед возвратом результата
    if (process.env.NO_ROLES !== 'true') {
      await this.modelsCacheService.forceUpdateCache()
    }

    if (modelIds.size) {
      const modelsArray = Array.from(modelIds)
      const results = await Promise.all(
        modelsArray.map((model_id) =>
          this.getModels({ model_id, ignoreModeFilter: true })
        )
      )

      return [].concat(...results)
    }
  }

  async ensureSurrogateModelExists(model_id): Promise<ModelEntity | null> {
    const modelExistsInSum: ModelEntity | null =
      await this.sumModelService.getModelById(model_id)
    if (modelExistsInSum) {
      const modelExistsInMrm: ModelEntity | null =
        await this.mrmModelService.getModelById(model_id)
      if (!modelExistsInMrm) {
        return await this.surrogateModelCreate(model_id)
      }
    }
  }

  mergeArtefacts(modelsArtefacts) {
    return modelsArtefacts.map((modelItem) => {
      const artefactMap = new Map<
        string,
        { stringValues: string[]; valueIds: (number | null)[] }
      >()

      modelItem.artefacts.forEach((artefact) => {
        const {
          artefact_tech_label,
          artefact_string_value,
          artefact_value_id
        } = artefact

        if (!artefactMap.has(artefact_tech_label)) {
          artefactMap.set(artefact_tech_label, {
            stringValues: [],
            valueIds: []
          })
        }

        const entry = artefactMap.get(artefact_tech_label)
        entry.stringValues.push(artefact_string_value)
        entry.valueIds.push(artefact_value_id)
      })

      const mergedArtefacts = Array.from(artefactMap.entries()).map(
        ([label, { stringValues, valueIds }]) => {
          if (stringValues.length === 1) {
            return {
              artefact_tech_label: label,
              artefact_string_value: stringValues[0],
              artefact_value_id: valueIds[0]
            }
          }

          return {
            artefact_tech_label: label,
            artefact_string_value: stringValues,
            artefact_value_id: valueIds
          }
        }
      )

      return {
        ...modelItem,
        artefacts: mergedArtefacts
      }
    })
  }

  async updateModelName(data, source) {
    if (source === MODEL_SOURCES.SUM) {
      await this.sumModelService.updateModelName(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.mrmModelService.updateModelName(data)
    } else {
      throw new Error(`Unknown model source: ${source}`)
    }
  }

  async updateModelAllocation(data, source) {
    return this.allocationService.updateAllocation(data, source)
  }

  async executeDatabaseUpdates(updates, source: MODEL_SOURCES) {
    const {
      namesForUpdate = [],
      modelsAllocationForUpdate = [],
      modelsUsageForUpdate = [],
      artefactsForUpdate = []
    } = updates

    for (const name of namesForUpdate) {
      await this.updateModelName(name, source)
    }

    if (artefactsForUpdate.length) {
      await this.artefactService.updateArtefact(artefactsForUpdate, source)
    }

    for (const allocation of modelsAllocationForUpdate) {
      await this.updateModelAllocation(allocation, source)
    }

    await this.usageService.updateUsage(modelsUsageForUpdate, source)
  }

  private getGblId(label) {
    const map = {
      allocation_kib_usage: 1,
      allocation_smb_usage: 2,
      allocation_rb_usage: 3,
      allocation_kc_usage: 4,
      allocation_other_usage: 5,
      allocation_kib_comment: 1,
      allocation_smb_comment: 2,
      allocation_rb_comment: 3,
      allocation_kc_comment: 4,
      allocation_other_comment: 5
    }
    return map[label]
  }

  private createModelTypeDictionary(
    modelTypes: ModelType[]
  ): Record<string, number> {
    const dictionary: Record<string, number> = {}

    modelTypes.forEach((type) => {
      dictionary[type.name] = type.id
    })

    return dictionary
  }

  private async fetchAndMergeModels(
    date: string | null,
    model_id?: string | null
  ): Promise<Model[]> {
    const filterDate = date || null
    const sumModels = await this.sumDatabaseService.query(getSumModels, {
      filter_date: filterDate,
      model_id,
      use_previous_year_for_q4: canEditQuarter(4, new Date().getFullYear() - 1)
    })
    const mrmModels = await this.mrmDatabaseService.query(getSumRmModels, {
      filter_date: filterDate,
      model_id,
      use_previous_year_for_q4: canEditQuarter(4, new Date().getFullYear() - 1)
    })

    return await this.mergeSumAndMrmModels(
      sumModels,
      mrmModels,
      'system_model_id',
      filterDate
    )
  }

  private async mergeSumAndMrmModels(
    sumModels: Model[],
    mrmModels: Model[],
    prop: string,
    filterDate: string | null
  ): Promise<Model[]> {
    // Prefetch maps via dedicated service and merge via merge service (DI preferred; dynamic import used here)
    const { ModelMergePrefetchService } = await import(
      './services/model-merge-prefetch.service'
    )
    const { ModelMergeService } = await import('./services/model-merge.service')
    const prefetch = new ModelMergePrefetchService(
      this.sumDatabaseService,
      this.mrmDatabaseService
    )
    const { sumMap, mrmMap } = await prefetch.buildMergeMaps(
      sumModels,
      mrmModels,
      filterDate
    )

    const merger = new ModelMergeService()
    return await merger.mergeModels(sumModels, mrmModels, filterDate, {
      sumMap,
      mrmMap
    })
  }

  private async formatResults(models: Model[]): Promise<Model[]> {
    const artefacts: Artefact[] = await this.getArtefactLabels()

    return models.map((model: Model): Model => {
      Object.keys(model).forEach((techLabel) => {
        const artefact = artefacts.find(
          ({ artefact_tech_label }) => artefact_tech_label === techLabel
        )

        if (artefact) {
          const artefactTechLabel = artefact.artefact_tech_label
          const artefactTypeId = artefact.artefact_type_id
          const value = model[techLabel]

          if (ArtefactFormatting[artefactTypeId]) {
            switch (ArtefactFormatting[artefactTypeId]) {
              case ArtefactFormattingType.TEXT:
                model[techLabel] = ModelsService.formatStringField(value)
                break
              case ArtefactFormattingType.DATE:
                model[techLabel] = ModelsService.formatDateField(value)
                break
              case ArtefactFormattingType.NUMBER:
                model[techLabel] = ModelsService.formatNumberField(value)
                break
              default:
                break
            }
          }

          if (artefactTechLabel === 'model_status') {
            if (
              Object.values(LIFE_CYCLE_STAGES).includes(value) ||
              model.camunda_model_stage?.includes(
                MODEL_STATUS.REMOVED_FROM_OPERATION
              ) ||
              model.camunda_model_status?.includes(MODEL_STATUS.ARCHIVE)
            ) {
              const businessStatus = model.business_status
              const bpmnInstanceName = value

              const modelStage = ModelsService.formatModelStatus(
                businessStatus,
                bpmnInstanceName,
                model.camunda_model_stage,
                model.camunda_model_status
              )

              model['model_status'] = modelStage
            }

            model['business_status_uncut'] = model.business_status
            const modelStatus = ModelsService.formatModelBusinessStatus(
              model.camunda_model_stage,
              model.camunda_model_status || model.business_status
            )
            model['business_status'] = modelStatus
          }
        }
      })

      return model
    })
  }

  private static formatDateField(value: string | null): string | null {
    if (value === null) return null
    return isValidDate(value) ? formatDateTime(parseDate(value)) : ''
  }

  private static formatStringField(
    value: number | string | null
  ): string | null {
    if (value === null) return null
    return String(value)
  }

  private static formatNumberField(value: number | null): string | null {
    if (value === null) return null
    return String(value)
  }

  private static getLastActiveStatus = (activeStatuses) => {
    const activeStatusesList = activeStatuses?.split(';')

    if (activeStatusesList?.includes(MODEL_STATUS.REMOVED_FROM_OPERATION)) {
      return MODEL_STATUS.REMOVED_FROM_OPERATION
    }

    if (activeStatusesList?.includes(MODEL_STATUS.DEVELOPED_NOT_IMPLEMENTED)) {
      return MODEL_STATUS.DEVELOPED_NOT_IMPLEMENTED
    }

    return activeStatusesList?.[0]
  }

  private static determineLifecycleStage = (businessStatus, modelStatus) => {
    switch (businessStatus) {
      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.FAST_MODEL_PROCESS]:
        if (
          modelStatus === MODEL_STATUS.IMPLEMENTED_IN_PIM ||
          modelStatus === MODEL_STATUS.VALIDATED_OUTSIDE_PIM ||
          modelStatus === MODEL_STATUS.IMPLEMENTED_OUTSIDE_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]
        }
        break

      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.MODEL]:
        if (
          modelStatus === MODEL_STATUS.VALIDATED_OUTSIDE_PIM ||
          modelStatus === MODEL_STATUS.IMPLEMENTED_OUTSIDE_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]
        }
        break

      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.INTEGRATION_MODEL]:
        if (
          modelStatus === MODEL_STATUS.VALIDATED_OUTSIDE_PIM ||
          modelStatus === MODEL_STATUS.IMPLEMENTED_OUTSIDE_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]
        }
        break

      case LIFE_CYCLE_STAGES_DESCRIPTION[
        LIFE_CYCLE_STAGES.TEST_PREPROD_TRANSFER_PROD
      ]:
        if (
          modelStatus === MODEL_STATUS.IMPLEMENTED_IN_PIM ||
          modelStatus === MODEL_STATUS.VALIDATED_IN_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION]
        }
        break

      default:
        return businessStatus
    }

    return businessStatus
  }

  private static formatModelStatus(
    status,
    bpmn_instance_name,
    camunda_model_stage: string | null,
    camunda_model_status: string | null
  ) {
    if (bpmn_instance_name === null) return null

    const lastActiveStatus = ModelsService.getLastActiveStatus(
      status || camunda_model_status
    )

    const stageIncludesRemoval = camunda_model_stage
      ?.split(';')
      .map((s) => s.trim())
      .includes(LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.REMOVAL])

    if (
      camunda_model_status?.includes(MODEL_STATUS.ARCHIVE) ||
      stageIncludesRemoval
    ) {
      if (
        lastActiveStatus === MODEL_STATUS.DEVELOPED_NOT_IMPLEMENTED ||
        lastActiveStatus === MODEL_STATUS.INEFFECTIVE_FOR_BUSINESS
      ) {
        return LIFE_CYCLE_STAGES_DESCRIPTION[
          LIFE_CYCLE_STAGES.DEVELOPED_NOT_IMPLEMENTED
        ]
      } else {
        return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.REMOVAL]
      }
    }

    let currentBusinessStatus =
      LIFE_CYCLE_STAGES_DESCRIPTION?.[bpmn_instance_name.trim()]

    currentBusinessStatus = ModelsService.determineLifecycleStage(
      currentBusinessStatus,
      lastActiveStatus
    )

    // фикс "транзита состояния модели"
    if (
      bpmn_instance_name === LIFE_CYCLE_STAGES.MODEL_STATE_TRANSITION &&
      (camunda_model_status || camunda_model_stage)
    ) {
      currentBusinessStatus = camunda_model_stage
    }

    switch (lastActiveStatus) {
      case MODEL_STATUS.DEVELOPED_NOT_IMPLEMENTED:
        return lastActiveStatus
      case MODEL_STATUS.REMOVED_FROM_OPERATION:
        return lastActiveStatus
      case MODEL_STATUS.CREATION_ERROR:
        return null
      default:
        return currentBusinessStatus
    }
  }

  private static formatModelBusinessStatus(
    stage: string | null,
    status: string | null
  ) {
    const lastActiveStatus = ModelsService.getLastActiveStatus(status || '')

    if (!stage) return lastActiveStatus

    const stageList = stage.split(';').map((s) => s.trim())

    // if (stageList.includes(MODEL_STATUS.REMOVED_FROM_OPERATION)) {
    //   return MODEL_STATUS.ARCHIVE
    // }

    return lastActiveStatus
  }

  private groupResultsByModelIdAndSource(
    firstDateResults: Model[],
    secondDateResults: Model[]
  ): GroupedResults {
    const groupedResults: GroupedResults = {}

    const allResults = [...firstDateResults, ...secondDateResults]
    const allKeys = new Set(
      allResults.map(
        (result) => `${result.system_model_id}:${result.model_source}`
      )
    )

    allKeys.forEach((key) => {
      const firstDateModel =
        firstDateResults.find(
          (result) => `${result.system_model_id}:${result.model_source}` === key
        ) || null
      const secondDateModel =
        secondDateResults.find(
          (result) => `${result.system_model_id}:${result.model_source}` === key
        ) || null

      groupedResults[key] = []

      if (firstDateModel) {
        groupedResults[key].push(firstDateModel)
      } else {
        groupedResults[key].push({})
      }

      if (secondDateModel) {
        groupedResults[key].push(secondDateModel)
      } else {
        groupedResults[key].push({})
      }
    })

    return groupedResults
  }

  async getArtefactLabels(): Promise<Artefact[]> {
    const result = await this.mrmDatabaseService.query(getSumRmArtefacts, [])
    const processedArtefacts = this.processArtefactData(result)

    return [...pseudoArtefacts, ...processedArtefacts]
  }

  private processArtefactData(data: any[]): Artefact[] {
    return data.reduce((prev: Artefact[], curr: any) => {
      const lastArtefact = prev[prev.length - 1]

      if (!lastArtefact || lastArtefact.artefact_id !== curr.artefact_id) {
        const newArtefact: Artefact = {
          artefact_id: curr.artefact_id,
          artefact_tech_label: curr.artefact_tech_label,
          artefact_label: curr.artefact_label,
          is_edit_flg: curr.is_edit_flg,
          artefact_desc: curr.artefact_desc,
          artefact_type_id: curr.artefact_type_id,
          artefact_type_desc: curr.artefact_type_desc,
          values: []
        }
        prev.push(newArtefact)
      }

      const artefactValue: ArtefactValue = {
        artefact_id: curr.artefact_id,
        is_active_flag: curr.is_active_flag,
        artefact_parent_value_id: curr.artefact_parent_value_id,
        artefact_value_id: curr.artefact_value_id,
        artefact_value: curr.artefact_value
      }

      if (artefactValue.artefact_value_id) {
        prev[prev.length - 1].values.push(artefactValue)
      }

      return prev
    }, [])
  }
}
