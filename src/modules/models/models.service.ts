import { BadRequestException, Injectable } from '@nestjs/common'
import { MrmModelService, SumModelService } from './services'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { AllocationSumService } from 'src/modules/allocation/allocation.sum.service'
import { UsageSumService } from 'src/modules/usage/usage.sum.service'
import { UsageSumRmService } from 'src/modules/usage/usage.sum.rm.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

import { getModels as getSumModels } from './sql/sum'
import {
  getArtefacts as getSumRmArtefacts,
  getModel as getSumRmModel,
  getModels as getSumRmModels,
  getModelsByTypeAndParentId as getSumRmModelsByTypeAndParentId,
  updateModelAllocation as updateSumRmModelAllocation
} from './sql/sum-rm'

import { MODEL_SOURCES, LIFE_CYCLE_STAGES_DESCRIPTION, LIFE_CYCLE_STAGES, MODEL_STATUS } from 'src/system/common/constants'
import { pseudoArtefacts } from './constants'
import { Artefact, ArtefactValue, GroupedResults, Model, ModelRelationsResponse, ModelType } from './interfaces'
import { CompareModelsDto, ModelsDto, ModelWithRelationsDto } from './dto'
import { ArtefactFormatting, ArtefactFormattingType } from './rules'

import { formatDateTime, isValidDate, parseDate } from 'src/system/common/utils'
import { ModelCreateDto } from 'src/api/dto/index.dto'
import { randomUUID } from 'crypto'
import { sql as parentSumRmModel } from 'src/api/sql/models/sum-rm/parent'
import { sql as createModel } from 'src/api/sql/models/sum-rm/create'
import { sql as newArtefacts } from 'src/api/sql/artefacts/new'

interface UsageEntry {
  confirmation_date: string | null;
  is_used: string | null;
}

const usageMap: Record<string, UsageEntry> = {}

interface ArtefactUpdateDto {
  artefact_tech_label: string,
  artefact_string_value: string,
  artefact_value_id: string | null
}

interface ModelsUpdateDto {
  model_id: string;
  model_source?: MODEL_SOURCES,
  artefacts: ArtefactUpdateDto[]
}


@Injectable()
export class ModelsService {
  constructor(
    private readonly sumModelService: SumModelService,
    private readonly mrmModelService: MrmModelService,
    private readonly artefactService: ArtefactService,
    private readonly allocationSumService: AllocationSumService,
    private readonly usageSumService: UsageSumService,
    private readonly usageSumRmService: UsageSumRmService,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async getModels(dto?: ModelsDto): Promise<Model[]> {
    const { date = null, model_id = null } = dto || {}
    const results = await this.fetchAndMergeModels(date, model_id)

    return await this.formatResults(results)
  }

  async getModelsByDates({ firstDate, secondDate }: CompareModelsDto): Promise<{ data: { cards: GroupedResults } }> {
    const firstDateResults = await this.fetchAndMergeModels(firstDate)
    const secondDateResults = await this.fetchAndMergeModels(secondDate)

    const formattedFirstDateResults = await this.formatResults(firstDateResults)
    const formattedSecondDateResults = await this.formatResults(secondDateResults)

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

  async getModelWithRelations({ model_id }: ModelWithRelationsDto): Promise<ModelRelationsResponse> {
    const mrmModel = await this.mrmDatabaseService.query(getSumRmModel, { model_id })

    const modelTypes: ModelType[] = await this.mrmDatabaseService.query('SELECT * FROM model_types', {})

    const modelTypeDict = this.createModelTypeDictionary(modelTypes)

    const modules = await this.mrmDatabaseService.query(getSumRmModelsByTypeAndParentId, {
      type_id: modelTypeDict.module,
      parent_model_id: model_id
    })

    const calibrations = await this.mrmDatabaseService.query(getSumRmModelsByTypeAndParentId, {
      type_id: modelTypeDict.calibration,
      parent_model_id: model_id
    })

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

  async modelCreate(artefacts: ModelCreateDto[]) {
    const model_id = randomUUID();
    let model_version = "1";
    let addParentArtefactsQueryParams;

    const parent_model_id_artefact = artefacts.find(artefact => artefact.artefact_tech_label === "parent_model_id");
    const parent_model_id = parent_model_id_artefact ? parent_model_id_artefact.artefact_string_value : undefined;
    const model_name_artefact = artefacts.find(artefact => artefact.artefact_tech_label === "model_name_validation");
    const model_name = model_name_artefact ? model_name_artefact.artefact_string_value : undefined;
    const model_desc_artefact = artefacts.find(artefact => artefact.artefact_tech_label === "model_desc");
    const model_desc = model_desc_artefact ? model_desc_artefact.artefact_string_value : undefined;

    if (!model_name) {
      throw new BadRequestException("Bad Request", "model_name is required");
    }

    if (!model_desc) {
      throw new BadRequestException("Bad Request", "model_desc is required");
    }

    if (parent_model_id) {
      // ищем родительскую модель
      const parentModels = await this.mrmDatabaseService.query(parentSumRmModel, { parent_model_id });

      // находим версию родительской модели
      const { root_model_id, parent_model_version } = parentModels.reduce(
        (prev, curr) => {
          if (
            !prev.parent_model_version ||
            prev.parent_model_version < curr.parent_model_version
          )
            return curr;
          return prev;
        },
        {}
      );

      model_version = String(Number(parent_model_version) + 1);

      const parentArtefacts = await this.mrmDatabaseService
        .query("SELECT * FROM artefact_realizations_new WHERE model_id = :parent_model_id  AND effective_to = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS')", { parent_model_id });

      addParentArtefactsQueryParams = parentArtefacts
        .map(({ artefact_id, artefact_string_value, artefact_value_id }) => ({ artefact_id, artefact_string_value, artefact_value_id, model_id }));
    }

    const createModelQueryParams = {
      model_id,
      model_name,
      model_desc,
      model_version
    };
    await this.mrmDatabaseService.query(createModel, createModelQueryParams);

    if (addParentArtefactsQueryParams) {
      await this.mrmDatabaseService.queryAll(newArtefacts, addParentArtefactsQueryParams);
    }

    const artefactsForUpdate = artefacts
      .filter(artefact => artefact.artefact_tech_label !== "model_name" && artefact.artefact_tech_label !== "model_desc")
      .map(artefact => ({ ...artefact, model_id }));

    await this.executeDatabaseUpdates({ artefactsForUpdate }, MODEL_SOURCES.MRM)

    return this.getModels({ model_id });
  }

  private isBasicInfoArtefact(label) {
    return [
      'model_id', 'model_version', 'model_alias',
      'model_status', 'create_date'
    ].includes(label)
  }

  private isNameArtefact(label) {
    return label === 'model_name'
  }

  private isDescriptionArtefact(label) {
    return label === 'model_desc'
  }

  private isAllocationUsageArtefact(label) {
    return [
      'allocation_kib_usage', 'allocation_smb_usage', 'allocation_rb_usage',
      'allocation_kc_usage', 'allocation_other_usage'
    ].includes(label)
  }

  private isAllocationCommentArtefact(label) {
    return [
      'allocation_kib_comment', 'allocation_smb_comment', 'allocation_rb_comment',
      'allocation_kc_comment', 'allocation_other_comment'
    ].includes(label)
  }

  private isUsageFlagArtefact(label) {
    return [
      'usage_confirm_flag_q1', 'usage_confirm_flag_q2',
      'usage_confirm_flag_q3', 'usage_confirm_flag_q4'
    ].includes(label)
  }

  private isUsageDateArtefact(label) {
    return [
      'usage_confirm_date_q1', 'usage_confirm_date_q2',
      'usage_confirm_date_q3', 'usage_confirm_date_q4'
    ].includes(label)
  }

  async modelsUpdate(modelsArtefacts, req) {
    const user = req.user
    const creator = user?.preferred_username || "unknown"

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

    const updateAllocation = (model_id: string, gbl_id: string, percent: string | null, comment: string | null): void => {
      if (!allocationMap[model_id]) {
        allocationMap[model_id] = {}
      }

      if (!allocationMap[model_id][gbl_id]) {
        allocationMap[model_id][gbl_id] = { model_id, gbl_id, percent: null, comment: null }
      }

      const allocation = allocationMap[model_id][gbl_id]
      allocation.percent = percent !== null ? percent : allocation.percent
      allocation.comment = comment !== null ? comment : allocation.comment
    }
    const updateUsage = (
      model_id: string,
      quarter: string,
      confirmation_date: string | null,
      is_used: string | null
    ): void => {
      if (!usageMap[model_id]) {
        usageMap[model_id] = {}
      }

      if (!usageMap[model_id][quarter]) {
        usageMap[model_id][quarter] = { confirmation_date: null, is_used: null }
      }

      const usage = usageMap[model_id][quarter]
      if (confirmation_date !== null) {
        usage.confirmation_date = confirmation_date
      }
      if (is_used !== null) {
        usage.is_used = is_used
      }
    }
    const allocationMap: Record<string, Record<string, { model_id: string; gbl_id: string; percent: string | null; comment: string | null }>> = {}
    const usageMap: Record<string, Record<string, { confirmation_date: string | null; is_used: string | null }>> = {}
    const modelsAllocationForUpdate = Object.entries(allocationMap).reduce((acc, [model_id, allocations]) => {
      const allocationArray = Object
        .values(allocations)
        .filter(allocation => allocation.percent !== '')
        .map(allocation => ({ ...allocation, model_id }))
      return acc.concat(allocationArray)
    }, [] as Array<{ model_id: string; gbl_id: string; percent: string | null; comment: string | null }>)
    const getQuarterEndDate = (quarter, year = new Date().getFullYear()) => {
      const currentDate = new Date();
      const currentQuarter = Math.floor((currentDate.getMonth() + 3) / 3);

      // Проверяем, передан ли текущий квартал и текущий год
      if (parseInt(quarter) === currentQuarter && year === currentDate.getFullYear()) {
        return currentDate;
      }

      // Если передан не текущий квартал, получаем последний день квартала
      const quarterEndMonths = {
        1: 2, // Март
        2: 5, // Июнь
        3: 8, // Сентябрь
        4: 11 // Декабрь
      };

      const month = quarterEndMonths[quarter];
      const lastDay = new Date(year, month + 1, 0); // 0-й день следующего месяца - последний день текущего

      return lastDay;
    }
    const modelsUsageForUpdate = Object.entries(usageMap).reduce((acc, [model_id, usages]) => {
      const usageArray = Object.entries(usages).map(([quarter, usage]) => ({
        model_id,
        confirmation_date: usage.confirmation_date || formatDateTime(getQuarterEndDate(quarter)).split('-').reverse().join('.'),
        is_used: usage.is_used ? usage.is_used === 'Да' : null
      }))
      return acc.concat(usageArray)
    }, [] as Array<{model_id: string, confirmation_date: string | null, is_used: boolean}>)

    for (const modelItem of modelsArtefacts) {
      const { model_id, artefacts, model_source } = modelItem
      modelIds.add(model_id)
      modelSource = model_source
      const updates = updatesBySource[model_source]

      for (const artefactItem of artefacts) {
        const { artefact_tech_label, artefact_string_value } = artefactItem

        if (this.isBasicInfoArtefact(artefact_tech_label)) {
          continue
        }

        if (this.isNameArtefact(artefact_tech_label)) {
          updates.namesForUpdate.push({ model_id, model_name: artefact_string_value })
          if (model_source === MODEL_SOURCES.SUM) {
            updatesBySource[MODEL_SOURCES.MRM].namesForUpdate.push({ model_id, model_name: artefact_string_value })
          }
        } else if (this.isDescriptionArtefact(artefact_tech_label)) {
          updates.descriptionsForUpdate.push({ model_id, model_desc: artefact_string_value })
          if (model_source === MODEL_SOURCES.SUM) {
            updatesBySource[MODEL_SOURCES.MRM].descriptionsForUpdate.push({ model_id, model_desc: artefact_string_value })
          }
        } else if (this.isAllocationUsageArtefact(artefact_tech_label)) {
          updateAllocation(model_id, this.getGblId(artefact_tech_label), artefact_string_value, null)
          // updates.modelsAllocationForUpdate.push({
          //   model_id,
          //   gbl_id: this.getGblId(artefact_tech_label),
          //   percent: artefact_string_value,
          //   comment: null
          // })
        } else if (this.isAllocationCommentArtefact(artefact_tech_label)) {
          updateAllocation(model_id, this.getGblId(artefact_tech_label), null, artefact_string_value)
          // updates.modelsAllocationForUpdate.push({
          //   model_id,
          //   gbl_id: this.getGblId(artefact_tech_label),
          //   percent: null,
          //   comment: artefact_string_value
          // })
        } else if (this.isUsageFlagArtefact(artefact_tech_label)) {
          updateUsage(model_id, artefact_tech_label.slice(-1), null, artefact_string_value)
          // updates.modelsUsageForUpdate.push({
          //   model_id,
          //   confirmation_date: null,
          //   is_used: artefact_string_value
          // })
        } else if (this.isUsageDateArtefact(artefact_tech_label)) {
          updateUsage(model_id, artefact_tech_label.slice(-1), artefact_string_value, null)
          // updates.modelsUsageForUpdate.push({
          //   model_id,
          //   confirmation_date: artefact_string_value,
          //   is_used: null
          // })
        } else {
          updates.artefactsForUpdate.push({ model_id, ...artefactItem, creator })
          if (model_source === MODEL_SOURCES.SUM) {
            updatesBySource[MODEL_SOURCES.MRM].artefactsForUpdate.push({ model_id, ...artefactItem, creator })
          }
        }
      }
    }

    await this.executeDatabaseUpdates(updatesBySource[MODEL_SOURCES.SUM], MODEL_SOURCES.SUM)
    await this.executeDatabaseUpdates(updatesBySource[MODEL_SOURCES.MRM], MODEL_SOURCES.MRM)

    if (modelSource === MODEL_SOURCES.MRM) {
      // Perform database updates
      await Promise.all([
        modelsAllocationForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmModelAllocation, modelsAllocationForUpdate),
        modelsUsageForUpdate.length && modelsUsageForUpdate.map(async item => await this.usageSumRmService.update(item))
      ])
    }

    if (modelSource === MODEL_SOURCES.SUM) {
      await Promise.all([
        modelsAllocationForUpdate.length && modelsAllocationForUpdate.map(async item => await this.allocationSumService.update(item)),
        modelsUsageForUpdate.length && modelsUsageForUpdate.map(async item => await this.usageSumService.update(item))
      ])
    }
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 1000)
    })

    if (modelIds.size) {
      const modelsArray = Array.from(modelIds)
      const results = await Promise.all(
        modelsArray.map((model_id) => this.getModels({ model_id }) )
      )

      return [].concat(...results)
    }
  }

  async updateModelName(data, source) {
    if (source === MODEL_SOURCES.SUM) {
      await this.sumModelService.updateModelName(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.mrmModelService.updateModelName(data)
    } else {
      throw new Error(`Unknown model source: ${ source }`)
    }
  }

  async updateModelDesc(data, source) {
    if (source === MODEL_SOURCES.SUM) {
      await this.sumModelService.updateModelDesc(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.mrmModelService.updateModelDesc(data)
    } else {
      throw new Error(`Unknown model source: ${ source }`)
    }
  }

  async updateModelAllocation(data, source) {
    if (source === MODEL_SOURCES.SUM) {
      await this.allocationSumService.update(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.mrmModelService.updateModelDesc(data)
    } else {
      throw new Error(`Unknown model source: ${ source }`)
    }
  }

  async updateModelUsage(data, source) {
    if (source === MODEL_SOURCES.SUM) {
      await this.usageSumService.update(data)
    } else if (source === MODEL_SOURCES.MRM) {
      await this.usageSumRmService.update(data)
    } else {
      throw new Error(`Unknown model source: ${ source }`)
    }
  }

  async executeDatabaseUpdates(updates, source: MODEL_SOURCES) {
    const {
      namesForUpdate = [],
      descriptionsForUpdate = [],
      modelsAllocationForUpdate = [],
      modelsUsageForUpdate = [],
      artefactsForUpdate = []
    } = updates

    for (const name of namesForUpdate) {
      await this.updateModelName(name, source)
    }

    for (const description of descriptionsForUpdate) {
      await this.updateModelDesc(description, source)
    }

    for (const artefact of artefactsForUpdate) {
      await this.artefactService.updateArtefact(artefact, source)
    }

    // for (const allocation of modelsAllocationForUpdate) {
    //   await this.updateModelAllocation(allocation, source)
    // }
    //
    // for (const usage of modelsUsageForUpdate) {
    //   await this.updateModelUsage(usage, source)
    // }
  }

  private getGblId(label) {
    const map = {
      'allocation_kib_usage': 1,
      'allocation_smb_usage': 2,
      'allocation_rb_usage': 3,
      'allocation_kc_usage': 4,
      'allocation_other_usage': 5,
      'allocation_kib_comment': 1,
      'allocation_smb_comment': 2,
      'allocation_rb_comment': 3,
      'allocation_kc_comment': 4,
      'allocation_other_comment': 5
    }
    return map[label]
  }

  private createModelTypeDictionary(modelTypes: ModelType[]): Record<string, number> {
    const dictionary: Record<string, number> = {}

    modelTypes.forEach(type => {
      dictionary[type.name] = type.id
    })

    return dictionary
  }

  private async fetchAndMergeModels(date: string | null, model_id?: string | null): Promise<Model[]> {
    const filterDate = date || null

    const sumModels = await this.sumDatabaseService.query(getSumModels, {
      filter_date: filterDate,
      model_id
    })
    const mrmModels = await this.mrmDatabaseService.query(getSumRmModels, {
      filter_date: filterDate,
      model_id
    })

    return this.mergeSumAndMrmModels(sumModels, mrmModels, 'system_model_id')
  }

  private mergeSumAndMrmModels(sumModels: Model[], mrmModels: Model[], prop: string): Model[] {
    const combineModels = mrmModels.map((mrmModel) => {
      const matchingSumModel = sumModels.find(
        (sumModel) => sumModel[prop] === mrmModel[prop]
      )

      if (matchingSumModel) {
        return this.mergeAttributes(matchingSumModel, mrmModel)
      }

      return mrmModel
    })

    const uniqueSumModels = sumModels.filter(
      (sumModel) => !mrmModels.some(
        (mrmModel) => mrmModel[prop] === sumModel[prop]
      )
    )

    return [...combineModels, ...uniqueSumModels]
  }

  private mergeAttributes(sumModels: Model, mrmModels: Model): Model {
    const mergedModel = { ...mrmModels }

    for (const key in sumModels) {
      if (mrmModels[key] === null || mrmModels[key] === undefined || key === 'model_source') {
        mergedModel[key] = sumModels[key]
      }
    }

    return mergedModel
  }

  private async formatResults(models: Model[]): Promise<Model[]> {
    const artefacts: Artefact[] = await this.getArtefactLabels()

    return models.map((model: Model): Model => {
      Object.keys(model).forEach((techLabel) => {
        const artefact = artefacts.find(({ artefact_tech_label }) => artefact_tech_label === techLabel)

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
            const businessStatus = model.business_status
            const bpmnInstanceName = value
            model[techLabel] = ModelsService.formatModelStatus(businessStatus, bpmnInstanceName)
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

  private static formatStringField(value: number | string | null): string | null {
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
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION];
        }
        break;
  
      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.MODEL]:
        if (
          modelStatus === MODEL_STATUS.VALIDATED_OUTSIDE_PIM || 
          modelStatus === MODEL_STATUS.IMPLEMENTED_OUTSIDE_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION];
        }
        break;
  
      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.INTEGRATION_MODEL]:
        if (
          modelStatus === MODEL_STATUS.VALIDATED_OUTSIDE_PIM || 
          modelStatus === MODEL_STATUS.IMPLEMENTED_OUTSIDE_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION];
        }
        break;
  
      case LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.TEST_PREPROD_TRANSFER_PROD]:
        if (
          modelStatus === MODEL_STATUS.IMPLEMENTED_IN_PIM || 
          modelStatus === MODEL_STATUS.VALIDATED_IN_PIM
        ) {
          return LIFE_CYCLE_STAGES_DESCRIPTION[LIFE_CYCLE_STAGES.VALIDATION];
        }
        break;
  
      default:
        return businessStatus;
    }
  
    return businessStatus;
  };

  private static formatModelStatus(status, bpmn_instance_name) {
    if (bpmn_instance_name === null) return null

    const lastActiveStatus = ModelsService.getLastActiveStatus(status)
    let currentBusinessStatus = LIFE_CYCLE_STAGES_DESCRIPTION?.[bpmn_instance_name.trim()]

    currentBusinessStatus = ModelsService.determineLifecycleStage(currentBusinessStatus, lastActiveStatus)

    switch (lastActiveStatus) {
      case MODEL_STATUS.DEVELOPED_NOT_IMPLEMENTED:
        return lastActiveStatus
      case MODEL_STATUS.REMOVED_FROM_OPERATION:
        return lastActiveStatus
      default:
        return currentBusinessStatus
    }
  }

  private groupResultsByModelIdAndSource(
    firstDateResults: Model[],
    secondDateResults: Model[]
  ): GroupedResults {
    const groupedResults: GroupedResults = {}

    const allResults = [...firstDateResults, ...secondDateResults]
    const allKeys = new Set(allResults.map(result => `${ result.system_model_id }:${ result.model_source }`))

    allKeys.forEach(key => {
      const firstDateModel = firstDateResults.find(result => `${ result.system_model_id }:${ result.model_source }` === key) || null
      const secondDateModel = secondDateResults.find(result => `${ result.system_model_id }:${ result.model_source }` === key) || null

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
