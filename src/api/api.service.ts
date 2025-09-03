import { Request } from 'express'
import { REQUEST } from '@nestjs/core'
import { Inject, Injectable, Scope } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { sql as getSumRmModelHistory } from './sql/models/sum-rm/history'
import { sql as getSumModelHistory } from './sql/models/sum/history'
import { sql as getTemplate } from './sql/templates/getTemplate'
import { sql as getTemplateByLowerName } from './sql/templates/getTemplateByLowerName'
import { sql as getTemplates } from './sql/templates/getTemplates'
import { sql as addTemplate } from './sql/templates/addTemplate'
import { sql as deleteTemplate } from './sql/templates/deleteTemplate'
import { sql as updateTemplate } from './sql/templates/updateTemplate'

import {
  ModelArtefactHistoryDto,
  ModelSource,
  TemplateCreateDto,
  TemplateUpdateDto
} from './dto/index.dto'

import { sortOrder } from './constants'

@Injectable({ scope: Scope.REQUEST })
export class ApiService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {}

  async getModelHistory(query: ModelArtefactHistoryDto) {
    const { model_source, model_id, artefact_tech_label } = query
    const result = await Promise.all([
      ...(await this.sumDatabaseService.query(getSumModelHistory, {
        model_id,
        artefact_tech_label
      })),
      ...(await this.mrmDatabaseService.query(getSumRmModelHistory, {
        model_id,
        artefact_tech_label
      }))
    ])

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
      getTemplateByLowerName,
      { template_name: templateCreateDto.template_name }
    )

    if (templateWithSameName.length) {
      throw new Error('Template name already exists!')
    }

    const result = await this.mrmDatabaseService.query(addTemplate, {
      user_id: user.preferred_username,
      ...templateCreateDto
    })

    const formattedResult = result.map((item) => {
      return {
        isOwner: item.user_id === user.preferred_username,
        ...item
      }
    })

    return formattedResult
  }

  async updateTemplate(templateUpdateDto: TemplateUpdateDto, user) {
    const templates = await this.mrmDatabaseService.query(getTemplates, [])
    const targetTemplate = templates.find(
      ({ template_id }) => template_id === templateUpdateDto.template_id
    )

    if (!targetTemplate) {
      throw new Error('Template not found')
    }

    if (targetTemplate.user_id !== user.preferred_username) {
      throw new Error("You don't have permission to edit the template")
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
        throw new Error('Template name already exists')
      }
    }

    try {
      const updatedTemplate = await this.mrmDatabaseService.query(
        updateTemplate,
        {
          template_name: null,
          public: null,
          template_value: null,
          ...templateUpdateDto
        }
      )

      if (updatedTemplate.length) {
        return {
          isOwner: true,
          ...updatedTemplate[0]
        }
      }
    } catch (e) {
      throw new Error('Something went wrong')
    }
  }

  async getTemplates(user) {
    const result = await this.mrmDatabaseService.query(getTemplates, [])

    const filteredTemplates = result
      .filter(({ user_id, public: is_public }) => {
        return user_id === user.preferred_username || is_public
      })
      .map(({ user_id, public: is_public, ...template }) => ({
        user_id,
        isOwner: user_id === user.preferred_username,
        public: is_public,
        ...template
      }))
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
    const result = await this.mrmDatabaseService.query(getTemplate, {
      template_id: id
    })

    const filteredTemplate = result.find(
      ({ user_id, public: is_public }) =>
        user_id === user.preferred_username || is_public
    )

    if (filteredTemplate) {
      return [
        {
          isOwner: filteredTemplate.user_id === user.preferred_username,
          ...filteredTemplate
        }
      ]
    } else {
      return []
    }
  }

  async deleteTemplate(id) {
    return await this.mrmDatabaseService.query(deleteTemplate, {
      template_id: id
    })
  }
}
