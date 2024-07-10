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
  ArtefactsUpdateDto,
  ModelArtefactHistoryDto,
  ModelCreateDto,
  ModelSource,
  TemplateCreateDto,
  TemplateUpdateDto
} from "./dto/index.dto";

import { isValidDate, formatDateTime } from "src/system/common/utils";

@Injectable({ scope: Scope.REQUEST })
export class ApiService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService
  ) {
  }

  async getModels() {
    const result_from_sum = await this.sumDatabaseService.query(allSumModels, {});
    const result_from_mrm = await this.mrmDatabaseService.query(allSumRmModels, {});

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
      .filter(item => item.artefact_type_id === "4")
      .map(artefact => artefact.artefact_tech_label);
    artefacts_type_date.push("update_date");

    const formatted_result = result.map((item: Record<string, any>): Record<string, any> => {
      for (let key in item) {
        if (artefacts_type_date.indexOf(key) > -1 && item[key] !== null) {
          if (isValidDate(item[key])) {
            item[key] = formatDateTime(new Date(item[key]));
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

  async modelsUpdate(modelsArtefacts) {
    const modelIds = [];
    const namesForUpdate = [];
    const descriptionsForUpdate = [];
    const artefactsForUpdate = [];

    modelsArtefacts.map(modelItem => {
      const model_id = modelItem.model_id;
      if (!modelIds.includes(model_id)) {
        modelIds.push(model_id);
      }

      modelItem.artefacts.map(artefactItem => {
        switch (artefactItem.artefact_tech_label) {
          case ("model_name"):
            namesForUpdate.push({ model_id, model_name: artefactItem.artefact_string_value });
            break;
          case ("model_desc"):
            descriptionsForUpdate.push({ model_id, model_desc: artefactItem.artefact_string_value });
            break;
          default:
            artefactsForUpdate.push({ model_id, ...artefactItem });
        }
      });
    });

    if (namesForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateModelName, namesForUpdate);
    }

    if (descriptionsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateModelDesc, descriptionsForUpdate);
    }

    if (artefactsForUpdate.length) {
      await this.mrmDatabaseService.queryAll(updateArtefacts, artefactsForUpdate);
    }

    if (modelIds.length) {
      const result = await this.mrmDatabaseService.queryAll(oneSumRmModels, modelIds.map(model_id => ({ model_id })));

      return result.flat();
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
