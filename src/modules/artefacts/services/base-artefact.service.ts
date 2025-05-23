import { Logger } from '@nestjs/common'
import { ARTEFACT_TYPES_REQUIRING_VALUES, PSEUDO_ARTEFACTS, pseudoArtefactsSourcesRoles } from '../constants'
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

    for (const pseudoArtefactSourcesRole of pseudoArtefactsSourcesRoles) {
      if (!artefactRolesMap.has(pseudoArtefactSourcesRole.artefact_id)) {
          artefactRolesMap.set(pseudoArtefactSourcesRole.artefact_id, { sum: [], sum_rm: [] });
      }
      artefactRolesMap.get(pseudoArtefactSourcesRole.artefact_id).sum = pseudoArtefactSourcesRole.roles.sum;
      artefactRolesMap.get(pseudoArtefactSourcesRole.artefact_id).sum_rm = pseudoArtefactSourcesRole.roles.sum_rm;
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

    const artefacts = [...PSEUDO_ARTEFACTS, ...cl(queryResult)];

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
      SELECT TO_CHAR(
        MAX(EFFECTIVE_FROM) AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow',
        'YYYY-MM-DD HH24:MI:SS'
      ) AS update_date
      FROM artefact_realizations
      WHERE model_id = :model_id
      `,
      { model_id }
    );
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


