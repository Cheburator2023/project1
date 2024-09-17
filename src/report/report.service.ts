// @ts-nocheck
import { BadRequestException, Injectable } from "@nestjs/common";
import { SumDatabaseService } from "src/system/sum-database/database.service";
import { MrmDatabaseService } from "src/system/mrm-database/database.service";
import { ExcelService } from "src/excel/excel.service";

type Artefact = {
  artefact_tech_label: string,
  artefact_label: string,
  artefact_type_desc: string
};

type Preset = {
  key: string,
  title: string,
  type: string
};

const PRESETS: Record<string, Preset> = {
  system_model_id: {
    key: "system_model_id",
    title: "Идентификатор версии модели",
    type: "string"
  },
  model_name: {
    key: "model_name",
    title: "Название модели",
    type: "string"
  },
  model_desc: {
    key: "model_desc",
    title: "Описание модели",
    type: "string"
  },
  model_alias: {
    key: "model_alias",
    title: "Алиас модели",
    type: "string"
  },
  update_date: {
    key: "update_date",
    title: "Отчетная дата / дата последних изменений информации о Модели",
    type: "date"
  },
  model_source: {
    key: "model_source",
    title: "Система источник данных",
    type: "string"
  }
};

@Injectable()
export class ReportService {
  constructor(
    private readonly sumDatabaseService: SumDatabaseService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly excelService: ExcelService
  ) {
  }

  async generateExcel(data: any[]): Promise<Buffer> {
    return this.excelService.createExcel(data);
  }

  async generateReportData(filters: { [key: string]: string[] }): Promise<any[]> {
    if (!Object.keys(filters).length) {
      throw new BadRequestException("Bad Request", "filter object cannot be empty");
    }

    // Получаем список меток артефактов из фильтров
    const artefactLabels = Object.keys(filters);

    // Запрос всех артефактов из таблицы artefacts
    const getAllArtefactWithTypeSql = `
      SELECT DISTINCT artefact_id, artefact_tech_label, artefact_label, artefact_type_desc
      FROM artefacts AS ar
      INNER JOIN artefact_x_type axt ON ar.artefact_type_id = axt.artefact_type_id
      WHERE artefact_tech_label = ANY($1)
    `;
    const artefacts = await this.mrmDatabaseService.query(getAllArtefactWithTypeSql, [artefactLabels]);

    // Артефакты, которые не были найдены в базе данных
    const modelArtefacts = artefactLabels.reduce((acc, label) => {
      if (!artefacts.some(artefact => artefact.artefact_tech_label === label)) {
        acc[label] = filters[label];
      }
      return acc;
    }, {});

    const headers = this.generateReportHeaders(artefacts, Object.keys(modelArtefacts));
    const sortedHeaders = this.sortHeadersByFilters(headers, filters);
    const body = await this.generateReportBody(filters, artefacts, modelArtefacts);

    return {
      headers: sortedHeaders,
      body
    };
  }

  private sortHeadersByFilters(headers, filters) {
    return Object
      .keys(filters)
      .map(filterKey => headers.find(header => header.key === filterKey))
      .filter(Boolean);
  }

  private generateReportHeaders(artefacts: Artefact[], modelArtefacts: string[]): Promise<Preset[]> {
    const artefactHeaders = artefacts.map(
      ({ artefact_tech_label, artefact_label, artefact_type_desc }) => ({
        key: artefact_tech_label,
        title: artefact_label,
        type: artefact_type_desc
      })
    );

    const modelArtefactHeaders = modelArtefacts.map(artefact => PRESETS[artefact]).filter(Boolean);

    return [...modelArtefactHeaders, ...artefactHeaders];
  }

  private async generateReportBody(filters, artefacts: Artefact[], modelArtefacts): Promise<any[]> {
    // Генерация конечного SQL запроса
    const request = `
      WITH ranked_artefacts AS (
    SELECT af.model_id AS system_model_id,
           af.artefact_id,
           af.artefact_string_value,
           ar.artefact_tech_label,
           ROW_NUMBER() OVER (
               PARTITION BY af.model_id, af.artefact_id
               ORDER BY af.effective_from DESC
               )       AS rn
    FROM artefact_realizations_new af
             INNER JOIN artefacts ar ON af.artefact_id = ar.artefact_id
),
        sorted_artefacts AS (
         SELECT system_model_id,
                artefact_id,
                artefact_string_value
         FROM ranked_artefacts
         WHERE rn = 1
     ),
     valid_models AS (
         ${this.generateFilterSqlRequest(artefacts, filters)}
     ),
     aggregated_artefacts AS (
         ${this.generateAggregateSqlRequest(artefacts)}
     )
     SELECT m.model_name,
       m.model_version,
       m.update_date,
       m.root_model_id,
       'sum-rm' AS model_source,
       (CASE
          WHEN m.root_model_id != '' THEN
              (CAST('model' || m.root_model_id AS Varchar(4000)) || '-v' ||
               CAST(m.model_version AS Varchar(4000)))
          ELSE NULL END) AS model_alias,
       a.*
FROM models_new m
         INNER JOIN aggregated_artefacts a ON m.model_id = a.system_model_id
         ${this.generateFilterModelSqlRequest(modelArtefacts)}
    `;

    return await this.mrmDatabaseService.query(request, []);
  }

  private generateAggregateSqlRequest(artefacts) {
    // Создание строки для агрегированных значений
    const aggregatedColumns = artefacts.map((artefact, index) => {
      const isLastElement = index === artefacts.length - 1;
      const columnExpression = `MAX(CASE WHEN af.artefact_id = ${ artefact.artefact_id } THEN af.artefact_string_value END) AS ${ artefact.artefact_tech_label }`;
      return isLastElement ? columnExpression : `${ columnExpression },`;
    }).join("\n");

    // Последняя часть запроса SQL
    const finalSqlPart = `
      FROM artefact_realizations_new af
      WHERE af.model_id IN (SELECT system_model_id FROM valid_models)
      GROUP BY af.model_id
    `;

    // Объединение частей SQL запроса
    return `
      SELECT af.model_id as system_model_id,
             ${ aggregatedColumns }
             ${ finalSqlPart }
    `;
  }

  private generateFilterSqlRequest(artefacts, filters) {
    const constructFilterCondition = (artefact, filter) => {
      if (!filter.length) {
        return "";
      }

      let conditions = [];

      const formattedFilter = filter.map(f => `'${ f }'`).join(", ");

      switch (artefact.artefact_type_desc) {
        case "date":
          conditions.push(`safe_cast_timestamp(CAST(arr.artefact_string_value AS Text)) BETWEEN safe_cast_timestamp('${ filter[0] }') AND safe_cast_timestamp('${ filter[1] }')`);
          break;
        case "boolean":
          conditions.push(`safe_cast_boolean(arr.artefact_string_value) = ANY (safe_cast_boolean_array(ARRAY [${ formattedFilter }]))`);
          break;
        default:
          if (filter.includes("not-null")) {
            conditions.push("arr.artefact_string_value IS NOT NULL");
          }
          conditions.push(`arr.artefact_string_value = ANY (ARRAY [${ formattedFilter }])`);
      }

      return conditions.length ? ` AND (${ conditions.join(" OR ") })` : "";
    };

    const mappedArtefacts = artefacts
      .map(artefact => {
        const filterCondition = constructFilterCondition(
          artefact,
          filters[artefact.artefact_tech_label] || []
        );
        return filterCondition
          ? `(arr.artefact_id = ${ artefact.artefact_id }${ filterCondition })`
          : "";
      })
      .filter(Boolean)
      .join(" OR ");

    if (!mappedArtefacts) {
      return `SELECT system_model_id FROM sorted_artefacts AS arr GROUP BY system_model_id`;
    }

    const artefactCount = artefacts.filter(artefact => filters[artefact.artefact_tech_label]?.length).length;

    return `SELECT system_model_id FROM sorted_artefacts AS arr WHERE ${mappedArtefacts} GROUP BY system_model_id HAVING COUNT(DISTINCT artefact_id) = ${artefactCount}`;
  }

  private generateFilterModelSqlRequest = ({
                                     system_model_id,
                                     root_model_id,
                                     update_date,
                                     model_name,
                                     model_desc,
                                     model_alias
                                   }) => {
    const generateCondition = (field, values, customAlias = false) => {
      if (!values || !values.length) return "";
      const conditions = [];
      if (values.includes("not-null")) {
        conditions.push(`${ customAlias ? `CONCAT('model', m.root_model_id, '-v', m.model_version)` : `m.${ field }` } IS NOT NULL`);
      }
      if (values.length > (values.includes("not-null") ? 1 : 0)) {
        conditions.push(`${ customAlias ? `CONCAT('model', m.root_model_id, '-v', m.model_version)` : `m.${ field }` } = ANY(ARRAY[${ values.map(v => `'${ v }'`).join(", ") }])`);
      }
      return conditions.join(" AND ");
    };

    const generateTimestampCondition = (field, values) => {
      if (!values || !values.length) return "";
      if (!values.length) return "";
      const conditions = [];
      if (values.includes("not-null")) {
        conditions.push(`${ field } IS NOT NULL`);
      }
      if (values.length > (values.includes("not-null") ? 1 : 0)) {
        conditions.push(`safe_cast_timestamp(CAST(m.${ field } AS Text)) BETWEEN safe_cast_timestamp('${ values[0] }') AND safe_cast_timestamp('${ values[1] }')`);
      }
      return conditions.join(" AND ");
    };

    const filters = [
      generateCondition("model_id", system_model_id),
      generateCondition("root_model_id", root_model_id),
      generateTimestampCondition("update_date", update_date),
      generateCondition("model_name", model_name),
      generateCondition("model_desc", model_desc),
      generateCondition("model_alias", model_alias, true)
    ].filter(condition => condition).join(" AND ");

    return filters ? `WHERE ${ filters }` : "";
  };
}
