import { Request } from "express";
import { REQUEST } from "@nestjs/core";
import { BadRequestException, Inject, Injectable, Scope } from "@nestjs/common";
import { randomUUID } from "crypto";
import { SumDatabaseService } from "src/system/sum-database/database.service";
import { MrmDatabaseService } from "src/system/mrm-database/database.service";
import { sql as allSumRmModels } from "./sql/models/sum-rm/all";
import { sql as oneSumRmModels } from "./sql/models/sum-rm/one";
import { sql as parentSumRmModel } from "./sql/models/sum-rm/parent";
import { sql as createModel } from "./sql/models/sum-rm/create";
import { sql as updateModelName } from "./sql/models/sum-rm/update_model_name";
import { sql as updateModelDesc } from "./sql/models/sum-rm/update_model_desc";
import { sql as updateUsageConfirm } from "./sql/models/sum-rm/update_usage_confirm";
import { sql as getSumRmModelHistory } from "./sql/models/sum-rm/history";
import { sql as getSumModelHistory } from "./sql/models/sum/history";
import { sql as allSumModels } from "./sql/models/sum/all";
import { sql as getTemplate } from "./sql/templates/getTemplate";
import { sql as getTemplateByLowerName } from "./sql/templates/getTemplateByLowerName";
import { sql as getTemplates } from "./sql/templates/getTemplates";
import { sql as addTemplate } from "./sql/templates/addTemplate";
import { sql as deleteTemplate } from "./sql/templates/deleteTemplate";
import { sql as updateTemplate } from "./sql/templates/updateTemplate";
import { sql as getClasses } from "./sql/artefacts/classes";
import { sql as updateArtefacts } from "./sql/artefacts/update";
import { sql as newArtefacts } from "./sql/artefacts/new";
import {
  ModelsDto,
  ArtefactsUpdateDto,
  ModelArtefactHistoryDto,
  ModelCreateDto,
  ModelSource,
  TemplateCreateDto,
  TemplateUpdateDto
} from "./dto/index.dto";

import { isValidDate, parseDate, formatDateTime } from "src/system/common/utils";

@Injectable({ scope: Scope.REQUEST })
export class ApiService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async getModels({ date }: ModelsDto) {
    const filter_date = date || null;

    const result_from_sum = await this.sumDatabaseService.query(allSumModels, {
      filter_date
    });
    const result_from_mrm = await this.mrmDatabaseService.query(allSumRmModels, {
      filter_date
    });

    mergeAttr(result_from_sum, result_from_mrm, "system_model_id");

    function mergeAttr(sumModels, mrmModels, prop) {
      return mrmModels.map(mrmModel => {
        const sumM = sumModels.find(sumModel => mrmModel[prop] === sumModel[prop]);
        if (sumM) {
          for (const key of Object.keys(mrmModel)) {
            if (mrmModel[key] == null) {
              mrmModel[key] = sumM[key] || null;
            }
          }
          return mrmModel;
        } else return mrmModel;
      });
    }

    const result = mergeModels(result_from_sum, result_from_mrm, "system_model_id");

    function mergeModels(a, b, prop) {
      const reduced = a.filter(aitem => !b.find(bitem => aitem[prop] === bitem[prop]));
      return reduced.concat(b);
    }

    const artefacts_from_mrm = await this.getClasses();
    const artefacts_type_date = artefacts_from_mrm.data
      .filter(item => item.artefact_type_id === "4" || item.artefact_type_id === "17")
      .map(artefact => artefact.artefact_tech_label);

    const formatted_result = result.map((item: Record<string, any>): Record<string, any> => {
      for (let key in item) {
        if (artefacts_type_date.indexOf(key) > -1 && item[key] !== null) {
          if (isValidDate(item[key])) {
            item[key] = formatDateTime(parseDate(item[key]));
          } else {
            item[key] = "invalid date";
          }
        }
      }

      return item;
    });

    return {
      data: {
        cards: formatted_result
      }
    };
  }

  async modelCreate(artefacts: ModelCreateDto[]) {
    const model_id = randomUUID();
    let model_version = "1";
    let addParentArtefactsQueryParams;

    const parent_model_id_artefact = artefacts.find(artefact => artefact.artefact_tech_label === "parent_model_id");
    const parent_model_id = parent_model_id_artefact ? parent_model_id_artefact.artefact_string_value : undefined;
    const model_name_artefact = artefacts.find(artefact => artefact.artefact_tech_label === "model_name");
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

    const addArtefactsQueryParams = artefacts
      .filter(artefact => artefact.artefact_tech_label !== "model_name" && artefact.artefact_tech_label !== "model_desc")
      .map(artefact => ({ ...artefact, model_id }));
    await this.mrmDatabaseService.queryAll(updateArtefacts, addArtefactsQueryParams);

    return await this.mrmDatabaseService.query(oneSumRmModels, { model_id });
  }

  // @TODO: декомпозиция, перенос в модуль models
  async modelsUpdate(modelsArtefacts) {
    const modelIds = []
    const namesForUpdate = []
    const descriptionsForUpdate = []
    const artefactsForUpdate = []
    const usageConfirmForUpdate = []

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
          case 'usage_confirm_date_q1':
          case 'usage_confirm_date_q2':
          case 'usage_confirm_date_q3':
          case 'usage_confirm_date_q4':
            usageConfirmForUpdate.push({ model_id, confirmation_date: artefactItem.artefact_string_value })
            break
          case 'active_model':
            const [model] = await this.mrmDatabaseService.query(oneSumRmModels, { model_id })

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
      await this.mrmDatabaseService.queryAll(updateModelName, namesForUpdate)
    }

    if (descriptionsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateModelDesc, descriptionsForUpdate)
    }

    if (usageConfirmForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateUsageConfirm, usageConfirmForUpdate)
    }

    if (artefactsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateArtefacts, artefactsForUpdate)
    }

    if (modelIds.length) {
      const result = await this.mrmDatabaseService.queryAll(oneSumRmModels, modelIds.map(model_id => ({ model_id })))

      const artefacts_from_mrm = await this.getClasses()
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
    return {
      "data": [...defaultArtefacts, ...cl(result)]
    };
  }

  async artefactsUpdate(artefacts: ArtefactsUpdateDto[]) {
    const modelNameArtefact = artefacts.filter(artefact => artefact.artefact_tech_label === "model_name");
    if (modelNameArtefact.length) {
      await this.mrmDatabaseService.query(updateModelName, {
        model_name: modelNameArtefact[0].artefact_string_value,
        model_id: modelNameArtefact[0].model_id
      });
    }

    const modelDescArtefact = artefacts.filter(artefact => artefact.artefact_tech_label === "model_desc");
    if (modelDescArtefact.length) {
      await this.mrmDatabaseService.query(updateModelDesc, {
        model_desc: modelDescArtefact[0].artefact_string_value,
        model_id: modelDescArtefact[0].model_id
      });
    }

    const baseArtefacts = artefacts.filter(artefact => artefact.artefact_tech_label !== "model_name" && artefact.artefact_tech_label !== "model_desc");
    if (baseArtefacts.length) {
      await this.mrmDatabaseService.queryAll(updateArtefacts, artefacts);
    }

    return;
  }
}

