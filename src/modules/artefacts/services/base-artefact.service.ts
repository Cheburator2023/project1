import { Logger } from '@nestjs/common'
import { ARTEFACT_TYPES_REQUIRING_VALUES } from '../constants'
import { ArtefactEntity, ArtefactValueEntity, ArtefactRealizationEntity } from '../entities'
import { UpdateArtefactDto, SingleValueArtefact, MultiDropdownArtefact } from '../dto'
import { IArtefactService } from '../interfaces'
import { UserType } from 'src/decorators'

export abstract class BaseArtefactService implements IArtefactService {
  protected abstract modelsTableName: string
  protected abstract artefactsTableName: string
  protected abstract artefactValuesTableName: string
  protected abstract artefactRealizationsTableName: string
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  async getArtefactWithPermissions(user: UserType) {
    const artefacts = await this.getArtefacts();
    const artefactRolesMap = await this.getAllArtefactRoles();
  
    const enrichedArtefacts = artefacts.data.map((artefact: ArtefactEntity) => {
      const permissions = this.canEditArtefactBySource(artefact, user, artefactRolesMap);
      return {
        ...artefact,
        is_editable_by_role_sum: permissions.is_editable_by_role_sum,
        is_editable_by_role_sum_rm: permissions.is_editable_by_role_sum_rm,
      };
    });
  
    return { data: enrichedArtefacts };
  }

  async getAllArtefactRoles(): Promise<Map<number, { sum: string[], sum_rm: string[] }>> {
    const pseudoArtefactsRoles = [
      {
          artefact_id: 1001,
          roles: {
              sum: ['ds_lead', 'business_customer', 'ds', 'mipm'],
              sum_rm: ['ds_lead', 'business_customer']
          }
      }
    ];


    const roles = await this.databaseService.query(`
      SELECT ar.artefact_id, ar.model_source, ARRAY_AGG(r.role_name) AS roles
      FROM artefact_source_roles ar
      JOIN roles r ON ar.role_id = r.role_id
      GROUP BY ar.artefact_id, ar.model_source;
    `);

    const artefactRolesMap = new Map<number, { sum: string[], sum_rm: string[] }>();

    for (const row of roles) {
        const modelSource = row.model_source as 'sum' | 'sum_rm';
        if (!artefactRolesMap.has(row.artefact_id)) {
            artefactRolesMap.set(row.artefact_id, { sum: [], sum_rm: [] });
        }
        artefactRolesMap.get(row.artefact_id)![modelSource] = row.roles;
    }

    for (const pseudoArtefactRole of pseudoArtefactsRoles) {
      if (!artefactRolesMap.has(pseudoArtefactRole.artefact_id)) {
          artefactRolesMap.set(pseudoArtefactRole.artefact_id, { sum: [], sum_rm: [] });
      }
      artefactRolesMap.get(pseudoArtefactRole.artefact_id).sum = pseudoArtefactRole.roles.sum;
      artefactRolesMap.get(pseudoArtefactRole.artefact_id).sum_rm = pseudoArtefactRole.roles.sum_rm;
    }

    return artefactRolesMap;
  }

  async getArtefacts(): Promise<any> {
    const queryResult = await this.databaseService.query(
      `
      SELECT DISTINCT t1.*,
            t2.*,
            t3.*,
            t1.ARTEFACT_ID,
            t3.ARTEFACT_TYPE_ID
      FROM ARTEFACTS t1
              LEFT JOIN
          ARTEFACT_VALUES t2
          ON
                      t1.ARTEFACT_ID = t2.ARTEFACT_ID
                  AND
                      t2.IS_ACTIVE_FLG = '1'
              INNER JOIN
          ARTEFACT_X_TYPE t3
          ON
              t1.ARTEFACT_TYPE_ID = t3.ARTEFACT_TYPE_ID
      ORDER BY t1.ARTEFACT_ID,
              t2.ARTEFACT_VALUE_ID
      `,
      []
    );

    const defaultArtefacts = [
      {
        artefact_id: 1000,
        artefact_tech_label: "model_name",
        artefact_label: "Название модели в реестре ДАДМ",
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

    const cl = (data) =>
      data.reduce((prev, curr) => {
        if (!prev.length || prev[prev.length - 1].artefact_id !== curr.artefact_id) {
          curr.values = [];
          prev.push(curr);
        }

        const artefactValue = {
          artefact_id: curr.artefact_id,
          is_active_flag: curr.is_active_flag,
          artefact_parent_value_id: curr.artefact_parent_value_id,
          artefact_value_id: curr.artefact_value_id,
          artefact_value: curr.artefact_value,
        };

        if (artefactValue.artefact_value_id) {
          prev[prev.length - 1].values.push(artefactValue);
        }

        return prev;
      }, []);

    const artefacts = [...defaultArtefacts, ...cl(queryResult)];

    return { data: artefacts };
  }

  async handleUpdateArtefact(data: UpdateArtefactDto) {
    if (this.isMultiDropdownArtefact(data)) {
      return await this.updateMultiDropdownArtefact(data as MultiDropdownArtefact)
    } else {
      return await this.updateArtefact(data as SingleValueArtefact)
    }
  }

  private isMultiDropdownArtefact(data: UpdateArtefactDto): boolean {
    return Array.isArray(data.artefact_string_value) && Array.isArray(data.artefact_value_id)
  }

  async updateMultiDropdownArtefact(artefactData: MultiDropdownArtefact): Promise<boolean> {
    const { model_id, artefact_tech_label, artefact_string_value, artefact_value_id, creator } = artefactData

    const model = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    const artefact: ArtefactEntity | null = await this.getArtefactByTechLabel(artefact_tech_label)
    if (!artefact) {
      return false
    }

    const differenceById = (arr1, arr2) => {
      const set = new Set(arr2.map((obj) => obj.artefact_value_id))
      return arr1.filter((obj) => !set.has(obj.artefact_value_id))
    }

    const artefactValues: ArtefactValueEntity[] = await this.getArtefactValues(artefact.artefact_id)
    const latestArtefactRealizations: ArtefactRealizationEntity[] | null = await this.getLatestArtefactRealizations(model_id, artefact.artefact_id)

    const newArr = artefact_string_value.map((item, index) => {
      const resolvedArtefactValueId = this.resolveArtefactValueId({
        artefact_string_value: artefact_string_value[index],
        artefact_value_id: artefact_value_id[index]
      } as SingleValueArtefact, artefactValues)


      return {
        model_id,
        artefact_tech_label,
        artefact_string_value: artefact_string_value[index],
        artefact_value_id: resolvedArtefactValueId,
        creator
      }
    })

    const addCandidates = latestArtefactRealizations ? differenceById(newArr, latestArtefactRealizations) : newArr
    const deleteCandidates = latestArtefactRealizations ? differenceById(latestArtefactRealizations, newArr) : null

    if (deleteCandidates) {
      await deleteCandidates.reduce(async (prevPromise, item) => {
        await this.setEffectiveToArtefactRealization(item, true)
      }, Promise.resolve())
    }

    if (addCandidates.length) {
      await addCandidates.reduce(async (prevPromise, item) => {
        await this.insertArtefactRealization(
          model_id,
          artefact.artefact_id,
          item.artefact_value_id,
          item.artefact_string_value,
          artefact,
          artefactValues,
          creator
        )
      }, Promise.resolve())
    }

    return true
  }

  async updateArtefact(artefactData: SingleValueArtefact): Promise<boolean> {
    const { model_id, artefact_tech_label, artefact_string_value, creator } = artefactData

    const model = await this.getModelById(model_id)
    if (!model) {
      return false
    }

    const artefact: ArtefactEntity | null = await this.getArtefactByTechLabel(artefact_tech_label)
    if (!artefact) {
      return false
    }

    const isSelectType: boolean = ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id)
    const artefactValues: ArtefactValueEntity[] | null = isSelectType ? await this.getArtefactValues(artefact.artefact_id) : null
    const resolvedArtefactValueId = this.resolveArtefactValueId(artefactData, artefactValues)
    const latestArtefactRealization: ArtefactRealizationEntity | null = await this.getLatestArtefactRealization(model_id, artefact.artefact_id)

    if (this.shouldSkipUpdate(latestArtefactRealization, resolvedArtefactValueId, artefact_string_value, isSelectType)) return false

    if (latestArtefactRealization) {
      await this.setEffectiveToArtefactRealization(latestArtefactRealization, isSelectType)
    }

    await this.insertArtefactRealization(
      model_id,
      artefact.artefact_id,
      resolvedArtefactValueId,
      artefact_string_value,
      artefact,
      artefactValues,
      creator
    )

    return true
  }

  //@TODO: вынести в модуль models
  async getModelById(model_id: UpdateArtefactDto['model_id']): Promise<any> {
    const [model] = await this.databaseService.query(
      `
      SELECT * FROM ${ this.modelsTableName } WHERE model_id = :model_id
      `,
      {
        model_id
      }
    )

    return model || null
  }

  async getArtefactByTechLabel(artefact_tech_label: UpdateArtefactDto['artefact_tech_label']): Promise<ArtefactEntity | null> {
    const [artefact] = await this.databaseService.query(
      `
      SELECT * FROM ${ this.artefactsTableName } WHERE artefact_tech_label = :artefact_tech_label
      `,
      {
        artefact_tech_label
      }
    )

    return artefact || null
  }

  async getArtefactValues(artefact_id: ArtefactEntity['artefact_id']): Promise<ArtefactValueEntity[]> {
    const artefactValues = this.databaseService.query(
      `
      SELECT * FROM ${ this.artefactValuesTableName } WHERE artefact_id = :artefact_id
      `,
      {
        artefact_id
      }
    )

    return artefactValues || null
  }

  async getLatestArtefactRealization(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity | null> {
    const [artefactRealization] = await this.databaseService.query(
      `
      SELECT *
        FROM (
          SELECT 
            *,
            ROW_NUMBER() OVER (
              PARTITION BY model_id, artefact_id
              ORDER BY effective_from DESC
            ) AS rn
          FROM ${ this.artefactRealizationsTableName }
        ) ar
        WHERE model_id = :model_id
          AND artefact_id = :artefact_id
          AND ar.rn = 1;
        `,
      {
        model_id,
        artefact_id
      }
    )

    return artefactRealization || null
  }

  async getLatestArtefactRealizations(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity[] | null> {
    const artefactRealizations = await this.databaseService.query(
      `
      SELECT
        *
      FROM ${ this.artefactRealizationsTableName }
      WHERE model_id = :model_id
            AND artefact_id = :artefact_id
        AND EFFECTIVE_TO = TO_TIMESTAMP('9999-12-3123:59:59','YYYY-MM-DDHH24:MI:SS');
      `,
      {
        model_id,
        artefact_id
      }
    )

    return artefactRealizations.length ? artefactRealizations : null
  }

  async setEffectiveToArtefactRealization(
    latestArtefactRealization: ArtefactRealizationEntity,
    isSelectType: boolean
  ): Promise<void> {
    const conditions = isSelectType
      ? (latestArtefactRealization.artefact_value_id === null)
        ? `AND artefact_value_id IS NULL`
        : `AND artefact_value_id = :artefact_value_id`
      : `AND artefact_string_value = '${ latestArtefactRealization.artefact_string_value }'`
    const queryParams = {
      model_id: latestArtefactRealization.model_id,
      artefact_id: latestArtefactRealization.artefact_id,
      ...(latestArtefactRealization.artefact_value_id !== null
        ? { artefact_value_id: latestArtefactRealization.artefact_value_id }
        : {})
    }
    await this.databaseService.query(
      `
      UPDATE ${ this.artefactRealizationsTableName }
      SET effective_to = CURRENT_TIMESTAMP(0)
      WHERE model_id = :model_id
        AND artefact_id = :artefact_id
        ${ conditions }
      `,
      queryParams
    )
  }

  resolveArtefactValueId(
    artefactData: SingleValueArtefact,
    artefactValues: ArtefactValueEntity[] | null
  ): number | null {
    const { artefact_value_id, artefact_string_value } = artefactData

    if (!artefactValues) return artefact_value_id

    const matchingValue = artefactValues.find(value => value.artefact_value_id === artefact_value_id)
    if (matchingValue) return artefact_value_id

    const valueByString = artefactValues.find(value => value.artefact_value.toLowerCase() === artefact_string_value.toLowerCase())
    if (valueByString) return valueByString.artefact_value_id

    return artefact_value_id
  }

  async insertArtefactRealization(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id'],
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value'],
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null,
    creator: string,
  ): Promise<void> {

    const finalStringValue = this.determineFinalStringValue(
      artefact,
      artefactValues,
      artefact_value_id,
      artefact_string_value
    )

    await this.databaseService.query(
      `
        INSERT INTO ${ this.artefactRealizationsTableName } (model_id, artefact_id, artefact_value_id, artefact_string_value, creator)
        SELECT :model_id, :artefact_id, :artefact_value_id, :artefact_string_value, :creator;
        `,
      {
        model_id,
        artefact_id,
        artefact_value_id,
        artefact_string_value: finalStringValue,
        creator
      }
    )
  }

  async getMaxArtefactUpdateDate(model_id: string): Promise<any> {
    return await this.databaseService.query(
      `
      SELECT MAX(EFFECTIVE_FROM) AS update_date FROM artefact_realizations
      WHERE model_id = :model_id
      `,
      {
        model_id
      }
    )
  }

  canEditArtefact(artefact: ArtefactEntity): boolean {
    return false;
  }

  canEditArtefactBySource(
    artefact: ArtefactEntity,
    user: UserType,
    artefactRolesMap: Map<number, { sum: string[], sum_rm: string[] }>
  ): { is_editable_by_role_sum: string, is_editable_by_role_sum_rm: string } {

    if (artefact.is_edit_flg === '0') {
      return { is_editable_by_role_sum: '0', is_editable_by_role_sum_rm: '0' };
    }
  
    const rolesForArtefact = artefactRolesMap.get(artefact.artefact_id) || { sum: [], sum_rm: [] };
  
    const isEditableSum = rolesForArtefact.sum.length > 0 && user.groups.some((role) => rolesForArtefact.sum.includes(role));
    const isEditableSumRm = rolesForArtefact.sum_rm.length > 0 && user.groups.some((role) => rolesForArtefact.sum_rm.includes(role));
  
    return {
      is_editable_by_role_sum: isEditableSum ? '1' : '0',
      is_editable_by_role_sum_rm: isEditableSumRm ? '1' : '0',
    };
  }

  private shouldSkipUpdate(
    latestArtefactRealization: ArtefactRealizationEntity | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value'],
    isSelectType: boolean
  ): boolean {
    if (!latestArtefactRealization) return false
    if (isSelectType && latestArtefactRealization.artefact_value_id === artefact_value_id) return true
    if (!isSelectType && latestArtefactRealization.artefact_string_value === artefact_string_value) return true
    return false
  }

  private determineFinalStringValue(
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value']
  ): string | null {
    if (ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id) && artefactValues) {
      const value = artefactValues.find(val => val.artefact_value_id === artefact_value_id)
      return value ? value.artefact_value : null
    }
    return artefact_string_value
  }
}


