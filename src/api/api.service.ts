import { Request } from 'express'
import { REQUEST } from '@nestjs/core'
import { Inject, Injectable, Scope } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { ModelsCacheService } from 'src/modules/models/models-cache.service'

import { sql as getSumRmModelHistorySql } from './sql/models/sum-rm/history'
import { sql as getSumModelHistorySql } from './sql/models/sum/history'

import { sql as getTemplateSql } from './sql/templates/getTemplate'
import { sql as getTemplateByLowerNameSql } from './sql/templates/getTemplateByLowerName'
import { sql as getTemplatesSql } from './sql/templates/getTemplates'
import { sql as addTemplateSql } from './sql/templates/addTemplate'
import { sql as deleteTemplateSql } from './sql/templates/deleteTemplate'
import { sql as updateTemplateSql } from './sql/templates/updateTemplate'

import {
  ModelArtefactHistoryDto,
  ModelSource,
  TemplateCreateDto,
  TemplateUpdateDto
} from './dto/index.dto'

import { sortOrder } from './constants'

interface LegacyTemplateValue {
  [key: string]: string[]
}

interface FilterModel {
  [key: string]: {
    filterType: string
    type?: string
    values?: string[]
    dateFrom?: string
    dateTo?: string
  }
}

interface NewTemplateValue {
  filterModel: FilterModel
  sortState: any[]
  legacy_values: LegacyTemplateValue
  columnState?: Array<{
    colId: string
    hide?: boolean
  }>
  selectedIds: string[]
}

@Injectable({ scope: Scope.REQUEST })
export class ApiService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly modelsCacheService: ModelsCacheService
  ) {}

  async getModelHistory(query: ModelArtefactHistoryDto) {
    const { model_id, artefact_tech_label } = query
    const model_source = query.model_source || ModelSource.SUM_RM

    let result = []

    if (model_source === ModelSource.SUM) {
      result = await this.sumDatabaseService.query(getSumModelHistorySql, {
        model_id,
        artefact_tech_label
      })
    } else if (model_source === ModelSource.SUM_RM) {
      result = await this.mrmDatabaseService.query(getSumRmModelHistorySql, {
        model_id,
        artefact_tech_label
      })
    } else {
      result = await Promise.all([
        ...(await this.sumDatabaseService.query(getSumModelHistorySql, {
          model_id,
          artefact_tech_label
        })),
        ...(await this.mrmDatabaseService.query(getSumRmModelHistorySql, {
          model_id,
          artefact_tech_label
        }))
      ])
    }

    function filterAndSortData(data: any[]) {
      return data
        .sort(
          (a, b) =>
            new Date(b.effective_from).getTime() -
            new Date(a.effective_from).getTime()
        ) // Сортируем от нового к старому
        .filter(
          (item, index, arr) =>
            index === 0 ||
            !arr
              .slice(0, index)
              .some(
                (prev) =>
                  prev.artefact_string_value === item.artefact_string_value
              )
        ) // Удаляем дубликаты artefact_string_value
    }

    const formattedResult = filterAndSortData(result).map((item) => {
      return {
        ...item,
        artefact_id: Number(item.artefact_id),
        artefact_value: item.artefact_string_value,
        effective_from: {
          timestamp: item.effective_from,
          timestamp_formatted: new Date(item.effective_from).toLocaleString(
            'ru'
          )
        },
        artefact_value_id: undefined,
        artefact_string_value: undefined,
        creator: undefined,
        editor: {
          username: item.creator
        }
      }
    })

    return formattedResult
  }

  async createTemplate(templateCreateDto: TemplateCreateDto, user) {
    const templateWithSameName = await this.mrmDatabaseService.query(
      getTemplateByLowerNameSql,
      { template_name: templateCreateDto.template_name }
    )

    if (templateWithSameName.length) {
      throw new Error('Template name already exists!')
    }

    const templateValue = {
      filterModel: templateCreateDto.filterModel || {},
      sortState: templateCreateDto.sortState || [],
      columnState: templateCreateDto.columnState || [],
      selectedIds: templateCreateDto.selectedIds || []
    }

    const result = await this.mrmDatabaseService.query(addTemplateSql, {
      user_id: user?.preferred_username,
      template_name: templateCreateDto.template_name,
      public: templateCreateDto.public,
      template_value: templateValue
    })

    const formattedResult = result.map((item) => {
      return {
        isOwner: item.user_id === user?.preferred_username,
        ...item
      }
    })

    return formattedResult
  }

  async updateTemplate(templateUpdateDto: TemplateUpdateDto, user) {
    const templates = await this.mrmDatabaseService.query(getTemplatesSql, [])
    const targetTemplate = templates.find(
      ({ template_id }) => template_id === templateUpdateDto.template_id
    )

    if (!targetTemplate) {
      throw new Error('Шаблон не найден')
    }

    if (targetTemplate.user_id !== user?.preferred_username) {
      throw new Error('У вас нет прав на редактирование шаблона')
    }

    if (
      templateUpdateDto.template_name &&
      templateUpdateDto.template_name.trim().toLowerCase() !==
        targetTemplate.template_name.trim().toLowerCase()
    ) {
      const templatesWithSameName = templates.find((template) => {
        return (
          template.template_id !== templateUpdateDto.template_id &&
          template.template_name.trim().toLowerCase() ===
            templateUpdateDto.template_name.trim().toLowerCase()
        )
      })

      if (templatesWithSameName) {
        throw new Error('Имя шаблона уже существует')
      }
    }

    try {
      const templateValue =
        templateUpdateDto.filterModel ||
        templateUpdateDto.sortState ||
        templateUpdateDto.columnState ||
        templateUpdateDto.selectedIds
          ? {
              filterModel: templateUpdateDto.filterModel,
              sortState: templateUpdateDto.sortState,
              columnState: templateUpdateDto.columnState,
              selectedIds: templateUpdateDto.selectedIds
            }
          : null

      const updatedTemplate = await this.mrmDatabaseService.query(
        updateTemplateSql,
        {
          template_name: templateUpdateDto.template_name || null,
          public: templateUpdateDto.public ?? null,
          template_value: templateValue,
          template_id: templateUpdateDto.template_id
        }
      )

      if (updatedTemplate.length) {
        return {
          isOwner: true,
          ...updatedTemplate[0]
        }
      }
    } catch (e) {
      throw new Error('Произошла ошибка')
    }
  }

  private isLegacyTemplateValue(value: any): value is LegacyTemplateValue {
    if (!value || typeof value !== 'object') return false
    return Object.values(value).every((v) => Array.isArray(v))
  }

  private async convertLegacyToNewFormat(
    legacyValue: LegacyTemplateValue
  ): Promise<NewTemplateValue> {
    const filterModel: FilterModel = {}

    for (const [key, values] of Object.entries(legacyValue)) {
      if (Array.isArray(values) && values.length > 0) {
        let processedValues = values.filter((v) => v !== 'empty')

        const hasNotNull = values.includes('not-null')

        if (hasNotNull) {
          // Удаляем 'not-null' из значений, так как это специальный маркер
          processedValues = processedValues.filter((v) => v !== 'not-null')

          // Если после удаления 'not-null' остались другие значения, используем их
          // Если остался только 'not-null', то получаем все непустые значения из базы
          if (processedValues.length === 0) {
            try {
              const allValues = await this.getAllValuesForColumn(key)
              // Фильтруем null/undefined значения для 'not-null' фильтра
              processedValues = allValues.filter(
                (value) =>
                  value !== null &&
                  value !== undefined &&
                  value !== '' &&
                  value.toString().trim() !== ''
              )
            } catch (error) {
              console.warn(
                `Не удалось получить значения для колонки ${key}:`,
                error
              )
              processedValues = []
            }
          }
        }

        if (key.includes('date')) {
          filterModel[key] = {
            filterType: 'date',
            type:
              processedValues[0] &&
              processedValues[1] &&
              !(processedValues[0] === processedValues[1])
                ? 'inRange'
                : 'equals',
            dateFrom: processedValues[0] || null,
            dateTo: processedValues[1] || null
          }
        } else {
          filterModel[key] = {
            filterType: 'set',
            values: processedValues
          }
        }
      }
    }

    return {
      filterModel,
      legacy_values: legacyValue,
      sortState: [],
      columnState: Object.keys(legacyValue).map((key) => ({
        colId: key,
        hide: false
      })),
      selectedIds: []
    }
  }

  private async getAllValuesForColumn(columnName: string): Promise<string[]> {
    try {
      const values = this.modelsCacheService.getColumnValues(columnName)

      return values
    } catch (error) {
      console.error(
        `Ошибка при получении значений для колонки -- ${columnName}:`,
        error
      )
      return []
    }
  }

  async getTemplates(user) {
    const result = await this.mrmDatabaseService.query(getTemplatesSql, [])

    const templatesWithProcessedValues = await Promise.all(
      result
        .filter(({ user_id, public: is_public }) => {
          return user_id === user?.preferred_username || is_public
        })
        .map(
          async ({
            user_id,
            public: is_public,
            template_value,
            ...template
          }) => {
            let processedTemplateValue = template_value

            if (this.isLegacyTemplateValue(template_value)) {
              processedTemplateValue = await this.convertLegacyToNewFormat(
                template_value
              )

              return {
                user_id,
                isOwner: user_id === user?.preferred_username,
                public: is_public,
                ...processedTemplateValue,
                ...template
              }
            }

            return {
              user_id,
              isOwner: user_id === user?.preferred_username,
              public: is_public,
              ...processedTemplateValue,
              ...template
            }
          }
        )
    )

    const filteredTemplates = templatesWithProcessedValues
      .sort((a, b) => {
        const pinnedDiff = Number(b.is_pinned) - Number(a.is_pinned)
        if (pinnedDiff !== 0) return pinnedDiff

        if (a.is_pinned && b.is_pinned) {
          const idDiff = a.template_id - b.template_id
          if (idDiff !== 0) return idDiff
        }

        return Number(b.isOwner) - Number(a.isOwner)
      })
      .map(({ is_pinned, ...template }) => template)

    return filteredTemplates
  }

  async getTemplate(id, user) {
    const result = await this.mrmDatabaseService.query(getTemplateSql, {
      template_id: id
    })

    const filteredTemplate = result.find(
      ({ user_id, public: is_public }) =>
        user_id === user?.preferred_username || is_public
    )

    if (filteredTemplate) {
      let processedTemplateValue = filteredTemplate.template_value

      if (this.isLegacyTemplateValue(filteredTemplate.template_value)) {
        processedTemplateValue = this.convertLegacyToNewFormat(
          filteredTemplate.template_value
        )
      }

      return [
        {
          isOwner: filteredTemplate.user_id === user?.preferred_username,
          ...filteredTemplate,
          template_value: processedTemplateValue
        }
      ]
    } else {
      return []
    }
  }

  async deleteTemplate(id) {
    return await this.mrmDatabaseService.query(deleteTemplateSql, {
      template_id: id
    })
  }

  async getAllModelsForGodMode(user) {
    return this.modelsCacheService.getCachedModels()
  }
}
