import { Injectable } from '@nestjs/common'
import { AllocationSumService } from 'src/modules/allocation/allocation.sum.service'
import { UsageSumService } from 'src/modules/usage/usage.sum.service'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

import {
  getModel as getSumModel,
  getModels as getSumModels,
  updateModelName as updateSumModelName,
  updateModelDesc as updateSumModelDesc,
  updateArtefact as updateSumArtefact
} from './sql/sum'
import {
  getModel as getSumRmModel,
  getModels as getSumRmModels,
  getArtefacts as getSumRmArtefacts,
  getModelsByTypeAndParentId as getSumRmModelsByTypeAndParentId,
  updateModelAllocation as updateSumRmModelAllocation,
  updateModelUsage as updateSumRmModelUsage,
  updateModelName as updateSumRmModelName,
  updateModelDesc as updateSumRmModelDesc,
  updateArtefact as updateSumRmArtefact
} from './sql/sum-rm'

import { pseudoArtefacts } from './constants'
import { Model, GroupedResults, PreparedArtefactsResult, Artefact, ArtefactValue, ModelRelationsResponse, ModelType } from './interfaces'
import { ModelsDto, CompareModelsDto, ModelWithRelationsDto } from './dto'
import { ArtefactFormattingType, ArtefactFormatting } from './rules'

import { isValidDate, parseDate, formatDateTime } from 'src/system/common/utils'

interface UsageEntry {
  confirmation_date: string | null;
  is_used: string | null;
}

const usageMap: Record<string, UsageEntry> = {}

enum ModelSource {
  SUM = 'sum',
  SUM_RM = 'sum-rm'
}

interface ArtefactUpdateDto {
  artefact_tech_label: string,
  artefact_string_value: string,
  artefact_value_id: string | null
}

interface ModelsUpdateDto {
  model_id: string;
  model_source?: ModelSource,
  artefacts: ArtefactUpdateDto[]
}


@Injectable()
export class ModelsService {
  constructor(
    private readonly allocationSumService: AllocationSumService,
    private readonly usageSumService: UsageSumService,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async getModels({ date }: ModelsDto): Promise<{ data: { cards: Model[] } }> {
    const results = await this.fetchAndMergeModels(date)

    const formattedResults = await this.formatResults(results)

    return {
      data: {
        cards: formattedResults
      }
    }
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

  async modelsUpdate(modelsArtefacts: Array<{
    model_id: string;
    model_source: string;
    artefacts: Array<{
      artefact_tech_label: string;
      artefact_string_value: string | null;
      artefact_value_id?: number | null;
    }>
  }>) {
    let modelSource = 'sum-rm'
    const modelIds: Set<string> = new Set()
    const namesForUpdate: Array<{ model_id: string; model_name: string }> = []
    const descriptionsForUpdate: Array<{ model_id: string; model_desc: string }> = []
    const artefactsForUpdate: Array<{
      model_id: string;
      artefact_tech_label: string;
      artefact_string_value: string | null;
      artefact_value_id?: number | null;
    }> = []
    const allocationMap: Record<string, Record<string, { model_id: string; gbl_id: string; percent: string | null; comment: string | null }>> = {}
    const usageMap: Record<string, { confirmation_date: string | null; is_used: string | null }> = {}

    // Helper functions
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

    const updateUsage = (model_id: string, confirmation_date: string | null, is_used: string | null): void => {
      if (!usageMap[model_id]) {
        usageMap[model_id] = { confirmation_date: null, is_used: null }
      }

      const usage = usageMap[model_id]
      if (confirmation_date !== null) {
        usage.confirmation_date = confirmation_date
      }
      if (is_used !== null) {
        usage.is_used = is_used
      }
    }

    // Process artefacts
    for (const modelItem of modelsArtefacts) {
      const { model_id, model_source, artefacts } = modelItem
      modelSource = model_source
      modelIds.add(model_id)

      for (const artefactItem of artefacts) {
        const { artefact_tech_label, artefact_string_value } = artefactItem

        switch (artefact_tech_label) {
          case 'model_name':
            namesForUpdate.push({ model_id, model_name: artefact_string_value! })
            break
          case 'model_desc':
            descriptionsForUpdate.push({ model_id, model_desc: artefact_string_value! })
            break
          case 'allocation_kib_usage':
          case 'allocation_smb_usage':
          case 'allocation_rb_usage':
          case 'allocation_kc_usage':
          case 'allocation_other_usage':
            updateAllocation(model_id, ModelsService.getGblId(artefact_tech_label), artefact_string_value, null)
            break
          case 'allocation_kib_comment':
          case 'allocation_smb_comment':
          case 'allocation_rb_comment':
          case 'allocation_kc_comment':
          case 'allocation_other_comment':
            updateAllocation(model_id, ModelsService.getGblId(artefact_tech_label), null, artefact_string_value)
            break
          case 'usage_confirm_flag_q1':
          case 'usage_confirm_flag_q2':
          case 'usage_confirm_flag_q3':
          case 'usage_confirm_flag_q4':
            updateUsage(model_id, null, artefact_string_value)
            break
          case 'usage_confirm_date_q1':
          case 'usage_confirm_date_q2':
          case 'usage_confirm_date_q3':
          case 'usage_confirm_date_q4':
            updateUsage(model_id, artefact_string_value, null)
            break
          case 'active_model': {
            if (modelSource !== 'sum-rm') {
              continue
            }
            const [model] = await this.mrmDatabaseService.query(getSumRmModel, { model_id })
            artefactsForUpdate.push({ model_id, ...artefactItem })
            artefactsForUpdate.push({
              model_id,
              artefact_tech_label: 'update_date',
              artefact_string_value: new Date().toISOString(),
              artefact_value_id: null
            })

            if (artefact_string_value !== model.active_model) {
              if (artefact_string_value === '1') {
                const modelIdentifier = model.regulatory_code_model_pvr ||
                  model.model_id_from_model_owner ||
                  model.identifier_model_algorithm_for_rwa ||
                  model.model_alias

                artefactsForUpdate.push({
                  model_id,
                  artefact_tech_label: 'model_id',
                  artefact_string_value: modelIdentifier,
                  artefact_value_id: null
                })
              }
            }
            break
          }
          default:
            artefactsForUpdate.push({ model_id, ...artefactItem })
        }
      }
    }

    const modelsAllocationForUpdate = Object.entries(allocationMap).reduce((acc, [model_id, allocations]) => {
      const allocationArray = Object.values(allocations).map(allocation => ({ ...allocation, model_id }))
      return acc.concat(allocationArray)
    }, [] as Array<{ model_id: string; gbl_id: string; percent: string | null; comment: string | null }>)

    const modelsUsageForUpdate = Object.entries(usageMap).map(([model_id, usage]) => ({
      model_id,
      confirmation_date: usage.confirmation_date || null,
      is_used: usage.is_used ? usage.is_used === 'Да' : null
    }))

    if (modelSource === 'sum-rm') {
      // Perform database updates
      await Promise.all([
        namesForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmModelName, namesForUpdate),
        descriptionsForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmModelDesc, descriptionsForUpdate),
        artefactsForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmArtefact, artefactsForUpdate),
        modelsAllocationForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmModelAllocation, modelsAllocationForUpdate),
        modelsUsageForUpdate.length && this.mrmDatabaseService.queryAll(updateSumRmModelUsage, modelsUsageForUpdate)
      ])
    } else {
      await Promise.all([
        namesForUpdate.length && this.sumDatabaseService.queryAll(updateSumModelName, namesForUpdate),
        descriptionsForUpdate.length && this.sumDatabaseService.queryAll(updateSumModelDesc, descriptionsForUpdate),
        artefactsForUpdate.length && this.sumDatabaseService.queryAll(updateSumArtefact, artefactsForUpdate),
        modelsAllocationForUpdate.length && modelsAllocationForUpdate.map(async item => await this.allocationSumService.update(item)),
        modelsUsageForUpdate.length && modelsUsageForUpdate.map(async item => await this.usageSumService.update(item))
      ])
    }

    if (modelIds.size) {
      // @TODO: обработка нескольких моделей
      if (modelSource === 'sum-rm') {
        const [model] = await this.mrmDatabaseService.queryAll(getSumRmModel, Array.from(modelIds).map(id => ({ model_id: id, filter_date: null })))
        const formattedResult = await this.formatResults(model)

        return {
          data: {
            cards: formattedResult
          }
        }
      } else {
        const [model] = await this.sumDatabaseService.queryAll(getSumModel, Array.from(modelIds).map(id => ({ model_id: id, filter_date: null })))
        const formattedResult = await this.formatResults(model)

        return {
          data: {
            cards: formattedResult
          }
        }
      }
    }
  }


  private static getGblId(label) {
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

  private async fetchAndMergeModels(date: string | null): Promise<Model[]> {
    const filterDate = date || null

    const sumModels = await this.sumDatabaseService.query(getSumModels, {
      filter_date: filterDate
    })
    const mrmModels = await this.mrmDatabaseService.query(getSumRmModels, {
      filter_date: filterDate
    })

    this.mergeAttributes(sumModels, mrmModels, 'system_model_id')

    return this.mergeModels(sumModels, mrmModels, 'system_model_id')
  }

  private mergeAttributes(sumModels: Model[], mrmModels: Model[], prop: string): void {
    mrmModels.forEach(mrmModel => {
      const sumModel = sumModels.find(sumModel => mrmModel[prop] === sumModel[prop])
      if (sumModel) {
        Object.keys(mrmModel).forEach(key => {
          if (mrmModel[key] == null) {
            mrmModel[key] = sumModel[key] || null
          }
        })
      }
    })
  }

  private mergeModels(a: Model[], b: Model[], prop: string): Model[] {
    const uniqueA = a.filter(aitem => !b.some(bitem => aitem[prop] === bitem[prop]))
    return uniqueA.concat(b)
  }

  private async formatResults(models: Model[]): Promise<Model[]> {
    const artefactLabels: Record<string, Artefact> = await this.getArtefactLabels()

    return models.map((model: Model): Model => {
      Object.keys(model).forEach((techLabel) => {
        const artefact = artefactLabels[techLabel]

        if (artefact) {
          const artefactTypeId = artefact.artefact_type_id
          const value = model[techLabel]

          if (ArtefactFormatting[artefactTypeId]) {
            switch (ArtefactFormatting[artefactTypeId]) {
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
        }
      })

      return model
    })
  }

  private async getArtefactLabels(): Promise<Record<string, Artefact>> {
    const artefacts = await this.getPreparedArtefacts()

    return artefacts.data.reduce((acc: Record<string, Artefact>, artefact: Artefact) => {
      if (ArtefactFormatting[artefact.artefact_type_id]) {
        acc[artefact.artefact_tech_label] = artefact
      }
      return acc
    }, {} as Record<string, Artefact>)
  }

  private static formatDateField(value: string | null): string | null {
    if (value === null) return null
    return isValidDate(value) ? formatDateTime(parseDate(value)) : 'invalid date'
  }

  private static formatNumberField(value: number | null): string | null {
    if (value === null) return null
    return String(value)
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

  private async getPreparedArtefacts(): Promise<PreparedArtefactsResult> {
    const result = await this.mrmDatabaseService.query(getSumRmArtefacts, [])
    const processedArtefacts = this.processArtefactData(result)

    return {
      data: [...pseudoArtefacts, ...processedArtefacts]
    }
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
