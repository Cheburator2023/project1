import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

import {
  getModels as getSumModels
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

  async modelsUpdate(modelsArtefacts) {
    const modelIds = []
    const namesForUpdate = []
    const descriptionsForUpdate = []
    const artefactsForUpdate = []

    const modelsAllocationForUpdate = []
    const modelsUsageForUpdate = []

    for (const modelItem of modelsArtefacts) {
      const model_id = modelItem.model_id
      if (!modelIds.includes(model_id)) {
        modelIds.push(model_id)
      }

      for (const artefactItem of modelItem.artefacts) {
        switch (artefactItem.artefact_tech_label) {
          case 'model_name':
            namesForUpdate.push({ model_id, model_name: artefactItem.artefact_string_value })
            break
          case 'model_desc':
            descriptionsForUpdate.push({ model_id, model_desc: artefactItem.artefact_string_value })
            break
          case 'allocation_kib_usage':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 1, percent: artefactItem.artefact_string_value, comment: null })
            break
          case 'allocation_smb_usage':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 2, percent: artefactItem.artefact_string_value, comment: null })
            break
          case 'allocation_rb_usage':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 3, percent: artefactItem.artefact_string_value, comment: null })
            break
          case 'allocation_kc_usage':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 4, percent: artefactItem.artefact_string_value, comment: null })
            break
          case 'allocation_other_usage':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 5, percent: artefactItem.artefact_string_value, comment: null })
            break
          case 'allocation_kib_comment':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 1, percent: null, comment: artefactItem.artefact_string_value })
            break
          case 'allocation_smb_comment':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 2, percent: null, comment: artefactItem.artefact_string_value })
            break
          case 'allocation_rb_comment':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 3, percent: null, comment: artefactItem.artefact_string_value })
            break
          case 'allocation_kc_comment':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 4, percent: null, comment: artefactItem.artefact_string_value })
            break
          case 'allocation_other_comment':
            modelsAllocationForUpdate.push({ model_id, gbl_id: 5, percent: null, comment: artefactItem.artefact_string_value })
            break
          case 'usage_confirm_flag_q1':
          case 'usage_confirm_flag_q2':
          case 'usage_confirm_flag_q3':
          case 'usage_confirm_flag_q4':
            modelsUsageForUpdate.push({ model_id, confirmation_date: null, is_used: artefactItem.artefact_string_value })
            break
          case 'usage_confirm_date_q1':
          case 'usage_confirm_date_q2':
          case 'usage_confirm_date_q3':
          case 'usage_confirm_date_q4':
            modelsUsageForUpdate.push({ model_id, confirmation_date: artefactItem.artefact_string_value, is_used: null })
            break
          case 'active_model':
            const [model] = await this.mrmDatabaseService.query(getSumRmModel, { model_id })

            artefactsForUpdate.push({ model_id, ...artefactItem })
            artefactsForUpdate.push({
              model_id,
              artefact_tech_label: 'update_date',
              artefact_string_value: new Date().toISOString(),
              artefact_value_id: null
            })

            if (artefactItem.artefact_string_value !== model.active_model) {
              let model_identifier

              if (artefactItem.artefact_string_value === '1') {
                model_identifier = model.regulatory_code_model_pvr ||
                  model.model_id_from_model_owner ||
                  model.identifier_model_algorithm_for_rwa ||
                  model.model_alias

                artefactsForUpdate.push({
                  model_id,
                  artefact_tech_label: 'model_id',
                  artefact_string_value: model_identifier,
                  artefact_value_id: null
                })
              }
            }
            break
          default:
            artefactsForUpdate.push({ model_id, ...artefactItem })
        }
      }
    }


    if (namesForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateSumRmModelName, namesForUpdate)
    }

    if (descriptionsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateSumRmModelDesc, descriptionsForUpdate)
    }

    if (artefactsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateSumRmArtefact, artefactsForUpdate)
    }

    if (modelsAllocationForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateSumRmModelAllocation, modelsAllocationForUpdate)
    }

    if (modelsUsageForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateSumRmModelUsage, modelsUsageForUpdate)
    }

    if (modelIds.length) {
      const result = await this.mrmDatabaseService.queryAll(getSumRmModel, modelIds.map(model_id => ({ model_id })))

      const artefacts_from_mrm = await this.getPreparedArtefacts()
      const artefacts_type_date = artefacts_from_mrm.data
        .filter(item => item.artefact_type_id === '4' || item.artefact_type_id === '17')
        .map(artefact => artefact.artefact_tech_label)

      const formatted_result = result.flat().map((item: Record<string, any>): Record<string, any> => {
        for (let key in item) {
          if (artefacts_type_date.includes(key) && item[key] !== null) {
            if (isValidDate(item[key])) {
              item[key] = formatDateTime(parseDate(item[key]))
            } else {
              item[key] = 'invalid date'
            }
          }
        }
        return item
      })

      return formatted_result
    }
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
