import { Logger } from '@nestjs/common'
import { ARTEFACT_TYPES_REQUIRING_VALUES } from '../constants'
import { ArtefactEntity, ArtefactValueEntity, ArtefactRealizationEntity } from '../entities'
import { UpdateArtefactDto } from '../dto'
import { IArtefactService } from '../interfaces'
import { User } from 'src/decorators'
export abstract class BaseArtefactService implements IArtefactService {
  protected abstract modelsTableName: string
  protected abstract artefactsTableName: string
  protected abstract artefactValuesTableName: string
  protected abstract artefactRealizationsTableName: string
  protected abstract logger: Logger

  protected constructor(public readonly databaseService) {
  }

  async getArtefactWithPermissions(user: User) {
    const artefacts = await this.getArtefacts();

    const artefactRolesMap = await this.getAllArtefactRoles()
  
    const enrichedArtefacts = artefacts.data.map((artefact: ArtefactEntity) => ({
      ...artefact,
      'is_editable_by_role': this.canEditArtefact(artefact, user, artefactRolesMap) ? '1' : '0',
    }));
  
    return { data: enrichedArtefacts };
  }

  async getAllArtefactRoles(): Promise<Map<number, Set<string>>> {
    const roles = await this.databaseService.query(`
      SELECT ar.artefact_id, r.role_name
      FROM artefact_roles ar
      JOIN roles r ON ar.role_id = r.role_id
    `);
  
    const artefactRolesMap = new Map<number, Set<string>>();
    for (const row of roles) {
      if (!artefactRolesMap.has(row.artefact_id)) {
        artefactRolesMap.set(row.artefact_id, new Set());
      }
      artefactRolesMap.get(row.artefact_id).add(row.role_name);
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
        is_edit_sum_flg: "1",
        is_edit_for_business_creator_flg: "1",
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
    return await this.updateArtefact(data)
  }

  async updateArtefact(artefactData: UpdateArtefactDto): Promise<boolean> {
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
    artefactData: UpdateArtefactDto,
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

  canEditArtefact(
    artefact: ArtefactEntity,
    user: User,
    artefactRolesMap: Map<number, Set<string>>
  ): boolean {
    if (artefact.is_edit_flg === '0') {
      return false;
    }
  
    const allowedRoles = artefactRolesMap.get(artefact.artefact_id) || new Set();
  
    if (allowedRoles.size === 0) {
      return true;
    }
  
    return user.groups.some((role) => allowedRoles.has(role));
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


