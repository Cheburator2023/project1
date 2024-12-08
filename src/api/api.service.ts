import { Request } from "express";
import { REQUEST } from "@nestjs/core";
import { Inject, Injectable, Scope } from "@nestjs/common";
import { SumDatabaseService } from "src/system/sum-database/database.service";
import { MrmDatabaseService } from "src/system/mrm-database/database.service";
import { sql as getSumRmModelHistory } from "./sql/models/sum-rm/history";
import { sql as getSumModelHistory } from "./sql/models/sum/history";
import { sql as getTemplate } from "./sql/templates/getTemplate";
import { sql as getTemplateByLowerName } from "./sql/templates/getTemplateByLowerName";
import { sql as getTemplates } from "./sql/templates/getTemplates";
import { sql as addTemplate } from "./sql/templates/addTemplate";
import { sql as deleteTemplate } from "./sql/templates/deleteTemplate";
import { sql as updateTemplate } from "./sql/templates/updateTemplate";
import { sql as getClasses } from "./sql/artefacts/classes";

import {
  ModelArtefactHistoryDto,
  ModelSource,
  TemplateCreateDto,
  TemplateUpdateDto
} from "./dto/index.dto";

import { sortOrder } from './constants'

@Injectable({ scope: Scope.REQUEST })
export class ApiService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async getModelHistory(query: ModelArtefactHistoryDto) {
    const { model_source, model_id, artefact_tech_label } = query;
    let result;
    if (model_source === ModelSource.SUM) {
      result = await this.sumDatabaseService.query(getSumModelHistory, { model_id, artefact_tech_label });
    }

    if (model_source === ModelSource.SUM_RM) {
      result = await this.mrmDatabaseService.query(getSumRmModelHistory, { model_id, artefact_tech_label });
    }

    const formattedResult = result.map(item => {
      return {
        ...item,
        artefact_id: Number(item.artefact_id),
        artefact_value: item.artefact_string_value,
        effective_from: {
          timestamp: item.effective_from,
          timestamp_formatted: (new Date(item.effective_from)).toLocaleString("ru")
        },
        artefact_value_id: undefined,
        artefact_string_value: undefined,
        creator: undefined,
        editor: {
          username: item.creator
        }
      };
    });

    return formattedResult;
  }

  async createTemplate(templateCreateDto: TemplateCreateDto, user) {
    const templateWithSameName = await this.mrmDatabaseService.query(getTemplateByLowerName, { template_name: templateCreateDto.template_name });

    if (templateWithSameName.length) {
      throw new Error("Template name already exists!");
    }

    const result = await this.mrmDatabaseService.query(addTemplate, {
      user_id: user.preferred_username,
      ...templateCreateDto
    });

    const formattedResult = result.map(item => {
      return {
        isOwner: item.user_id === user.preferred_username,
        ...item
      };
    });

    return formattedResult;
  }

  async updateTemplate(templateUpdateDto: TemplateUpdateDto, user) {
    const templates = await this.mrmDatabaseService.query(getTemplates, []);
    const targetTemplate = templates.find(({ template_id }) => template_id === templateUpdateDto.template_id);

    if (!targetTemplate) {
      throw new Error("Template not found");
    }

    if (targetTemplate.user_id !== user.preferred_username) {
      throw new Error("You don't have permission to edit the template");
    }

    if (templateUpdateDto.template_name && templateUpdateDto.template_name.trim().toLowerCase() !== targetTemplate.template_name.trim().toLowerCase()) {
      const templatesWithSameName = templates.find(template => {
        return template.template_id !== templateUpdateDto.template_id &&
          template.template_name.trim().toLowerCase() === templateUpdateDto.template_name.trim().toLowerCase();
      });

      if (templatesWithSameName) {
        throw new Error("Template name already exists");
      }
    }

    try {
      const updatedTemplate = await this.mrmDatabaseService.query(updateTemplate, {
        template_name: null,
        public: null,
        template_value: null,
        ...templateUpdateDto
      });

      if (updatedTemplate.length) {
        return {
          isOwner: true,
          ...updatedTemplate[0]
        };
      }
    } catch (e) {
      throw new Error("Something went wrong");
    }
  }

  async getTemplates(user) {
    const result = await this.mrmDatabaseService.query(getTemplates, []);

    return result.reduce((filteredTemplates, { user_id, public: is_public, ...template }) => {
      const isOwner = user_id === user.preferred_username;

      if (isOwner || is_public) {
        filteredTemplates.push({
          user_id,
          isOwner,
          public: is_public,
          ...template
        });
      }

      return filteredTemplates;
    }, []);
  }

  async getTemplate(id, user) {
    const result = await this.mrmDatabaseService.query(getTemplate, { template_id: id });

    const filteredTemplate = result.find(({ user_id, public: is_public }) => user_id === user.preferred_username || is_public);

    if (filteredTemplate) {
      return [
        {
          isOwner: filteredTemplate.user_id === user.preferred_username,
          ...filteredTemplate
        }
      ];
    } else {
      return [];
    }
  }

  async deleteTemplate(id) {
    return await this.mrmDatabaseService.query(deleteTemplate, { template_id: id });
  }

  async getClasses(): Promise<any> {
    const result = await this.mrmDatabaseService.query(getClasses, []);
    const defaultArtefacts = [
      {
        artefact_id: 1000,
        artefact_tech_label: "model_name",
        artefact_label: "Название модели",
        is_edit_flg: "1",
        artefact_desc: "",
        artefact_type_id: "1",
        artefact_type_desc: "text",
        values: []
      },
      {
        artefact_id: 1001,
        artefact_tech_label: "model_desc",
        artefact_label: "Описание модели",
        is_edit_flg: "1",
        artefact_desc: "",
        artefact_type_id: "1",
        artefact_type_desc: "text",
        values: []
      },
      {
        artefact_id: 2119,
        artefact_tech_label: "create_date",
        artefact_label: "Дата создания модели",
        is_edit_flg: "0",
        artefact_desc: "",
        artefact_type_id: "4",
        artefact_type_desc: "date",
        values: []
      },
      // @TODO: Группа: Аллокация применения (указывается в %, максимально 100 по всем 5 полям)

      {
        artefact_id: 3000,
        artefact_tech_label: 'allocation_kib_usage',
        artefact_label: 'КИБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '16',
        artefact_type_desc: 'percentage',
        group: 'Аллокация применения',
        values: []
      },
      {
        artefact_id: 3001,
        artefact_tech_label: 'allocation_smb_usage',
        artefact_label: 'CМБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '16',
        artefact_type_desc: 'percentage',
        group: 'Аллокация применения',
        values: []
      },
      {
        artefact_id: 3002,
        artefact_tech_label: 'allocation_rb_usage',
        artefact_label: 'РБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '16',
        artefact_type_desc: 'percentage',
        group: 'Аллокация применения',
        values: []
      },
      {
        artefact_id: 3003,
        artefact_tech_label: 'allocation_kc_usage',
        artefact_label: 'КЦ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '16',
        artefact_type_desc: 'percentage',
        group: 'Аллокация применения',
        values: []
      },
      {
        artefact_id: 3004,
        artefact_tech_label: 'allocation_other_usage',
        artefact_label: 'Другое',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '16',
        artefact_type_desc: 'percentage',
        group: 'Аллокация применения',
        values: []
      },

      // @TODO: Группа: Комментарий к аллокации применения (текстовый комментарий для каждой ГБЛ)

      {
        artefact_id: 3005,
        artefact_tech_label: 'allocation_kib_comment',
        artefact_label: 'КИБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '1',
        artefact_type_desc: 'text',
        group: 'Комментарий к аллокации применения',
        values: []
      },
      {
        artefact_id: 3006,
        artefact_tech_label: 'allocation_smb_comment',
        artefact_label: 'CМБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '1',
        artefact_type_desc: 'text',
        group: 'Комментарий к аллокации применения',
        values: []
      },
      {
        artefact_id: 3007,
        artefact_tech_label: 'allocation_rb_comment',
        artefact_label: 'РБ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '1',
        artefact_type_desc: 'text',
        group: 'Комментарий к аллокации применения',
        values: []
      },
      {
        artefact_id: 3008,
        artefact_tech_label: 'allocation_kc_comment',
        artefact_label: 'КЦ',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '1',
        artefact_type_desc: 'text',
        group: 'Комментарий к аллокации применения',
        values: []
      },
      {
        artefact_id: 3009,
        artefact_tech_label: 'allocation_other_comment',
        artefact_label: 'Другое',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '1',
        artefact_type_desc: 'text',
        group: 'Комментарий к аллокации применения',
        values: []
      },


      //  @TODO: Группа: Дата подтверждения использования (Указывается дата подтверждения по кварталам в формате дд/мм/гггг)

      {
        artefact_id: 3010,
        artefact_tech_label: 'usage_confirm_date_q1',
        artefact_label: '1Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '17',
        artefact_type_desc: 'quarterly_date',
        group: 'Дата подтверждения использования',
        start_date_depend_artefact: 'create_date',
        values: []
      },
      {
        artefact_id: 3011,
        artefact_tech_label: 'usage_confirm_date_q2',
        artefact_label: '2Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '17',
        artefact_type_desc: 'quarterly_date',
        group: 'Дата подтверждения использования',
        start_date_depend_artefact: 'create_date',
        values: []
      },
      {
        artefact_id: 3012,
        artefact_tech_label: 'usage_confirm_date_q3',
        artefact_label: '3Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '17',
        artefact_type_desc: 'quarterly_date',
        group: 'Дата подтверждения использования',
        start_date_depend_artefact: 'create_date',
        values: []
      },
      {
        artefact_id: 3013,
        artefact_tech_label: 'usage_confirm_date_q4',
        artefact_label: '4Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '18',
        artefact_type_desc: 'quarterly_date',
        group: 'Дата подтверждения использования',
        start_date_depend_artefact: 'create_date',
        values: []
      },


      // @TODO: Модель используется заказчиком (Dropdown с вариантами Да/Нет)

      {
        artefact_id: 3014,
        artefact_tech_label: 'usage_confirm_flag_q1',
        artefact_label: '1Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '19',
        artefact_type_desc: 'quarterly_dropdown',
        group: 'Модель используется заказчиком',
        values: [
          {
            artefact_id: 3014,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 100,
            artefact_value: 'Да'
          },
          {
            artefact_id: 3014,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 101,
            artefact_value: 'Нет'
          }
        ]
      },
      {
        artefact_id: 3015,
        artefact_tech_label: 'usage_confirm_flag_q2',
        artefact_label: '2Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '19',
        artefact_type_desc: 'quarterly_dropdown',
        group: 'Модель используется заказчиком',
        values: [
          {
            artefact_id: 3015,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 102,
            artefact_value: 'Да'
          },
          {
            artefact_id: 3015,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 103,
            artefact_value: 'Нет'
          }
        ]
      },
      {
        artefact_id: 3016,
        artefact_tech_label: 'usage_confirm_flag_q3',
        artefact_label: '3Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '19',
        artefact_type_desc: 'quarterly_dropdown',
        group: 'Модель используется заказчиком',
        values: [
          {
            artefact_id: 3016,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 104,
            artefact_value: 'Да'
          },
          {
            artefact_id: 3016,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 105,
            artefact_value: 'Нет'
          }
        ]
      },
      {
        artefact_id: 3017,
        artefact_tech_label: 'usage_confirm_flag_q4',
        artefact_label: '4Q',
        is_edit_flg: '1',
        artefact_desc: '',
        artefact_type_id: '19',
        artefact_type_desc: 'quarterly_dropdown',
        group: 'Модель используется заказчиком',
        values: [
          {
            artefact_id: 3017,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 106,
            artefact_value: 'Да'
          },
          {
            artefact_id: 3017,
            is_active_flag: '1',
            artefact_parent_value_id: null,
            artefact_value_id: 107,
            artefact_value: 'Нет'
          }
        ]
      }
    ];
    const cl = data => data.reduce(
      (prev, curr) => {
        if (!prev.length || prev[prev.length - 1].artefact_id !== curr.artefact_id) {
          curr.values = [];
          prev.push(curr);
        }

        const artefactValue = {
          artefact_id: curr.artefact_id,
          is_active_flag: curr.is_active_flag,
          artefact_parent_value_id: curr.artefact_parent_value_id,
          artefact_value_id: curr.artefact_value_id,
          artefact_value: curr.artefact_value
        };

        if (artefactValue.artefact_value_id)
          prev[prev.length - 1].values.push(artefactValue);

        return prev;
      },
      []
    );
    const artefacts = [...defaultArtefacts, ...cl(result)]

    artefacts.forEach(artefact => {
      const techLabel = artefact.artefact_tech_label
      const order = sortOrder[techLabel]

      if (order) {
        artefact.values.sort((a, b) => {
          const indexA = order.indexOf(a.artefact_value_id)
          const indexB = order.indexOf(b.artefact_value_id)
          return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) -
            (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB)
        })
      }
    })

    return {
      data: artefacts
    };
  }
}

