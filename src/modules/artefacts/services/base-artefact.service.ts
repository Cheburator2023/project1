import { LoggerService } from 'src/system/logger/logger.service'
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

  protected constructor(
    public readonly databaseService,
    protected readonly logger: LoggerService
  ) {}

  async getArtefactWithPermissions(user: UserType) {
    this.logger.info('Getting artefacts with permissions', 'ПолучениеАртефактовСПравами', {
      user_groups: user.groups,
      user_name: user.name
    });

    try {
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

      this.logger.info('Artefacts with permissions retrieved successfully', 'АртефактыСПравамиУспешноПолучены', {
        artefacts_count: enrichedArtefacts.length,
        user_groups: user.groups
      });

      return { data: enrichedArtefacts };
    } catch (error) {
      this.logger.error('Error getting artefacts with permissions', 'ОшибкаПолученияАртефактовСПравами', error, {
        user_groups: user.groups,
        user_name: user.name
      });
      throw error;
    }
  }

  async getAllArtefactRoles(): Promise<Map<number, { sum: string[], sum_rm: string[] }>> {
    this.logger.info('Getting all artefact roles', 'ПолучениеВсехРолейАртефактов');

    try {
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
        artefactRolesMap.get(pseudoArtefactSourcesRole.artefact_id)!.sum = pseudoArtefactSourcesRole.roles.sum;
        artefactRolesMap.get(pseudoArtefactSourcesRole.artefact_id)!.sum_rm = pseudoArtefactSourcesRole.roles.sum_rm;
      }

      this.logger.info('Artefact roles retrieved successfully', 'РолиАртефактовУспешноПолучены', {
        roles_count: artefactRolesMap.size,
        pseudo_artefacts_count: pseudoArtefactsSourcesRoles.length
      });

      return artefactRolesMap;
    } catch (error) {
      this.logger.error('Error getting artefact roles', 'ОшибкаПолученияРолейАртефактов', error);
      throw error;
    }
  }

  async getArtefacts(): Promise<any> {
    this.logger.info('Getting all artefacts', 'ПолучениеВсехАртефактов');

    try {
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
                t2.SORT_ORDER NULLS LAST,
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

      this.logger.info('Artefacts retrieved successfully', 'АртефактыУспешноПолучены', {
        artefacts_count: artefacts.length,
        pseudo_artefacts_count: PSEUDO_ARTEFACTS.length,
        database_artefacts_count: queryResult.length
      });

      return { data: artefacts };
    } catch (error) {
      this.logger.error('Error getting artefacts', 'ОшибкаПолученияАртефактов', error);
      throw error;
    }
  }

  async handleUpdateArtefact(data: UpdateArtefactDto) {
    this.logger.info('Handling update artefact', 'ОбработкаОбновленияАртефакта', {
      model_id: data.model_id,
      artefact_tech_label: data.artefact_tech_label,
      creator: data.creator
    });

    if (this.isMultiDropdownArtefact(data)) {
      return await this.updateMultiDropdownArtefact(data as MultiDropdownArtefact)
    } else {
      return await this.updateArtefact(data as SingleValueArtefact)
    }
  }

  private isMultiDropdownArtefact(data: UpdateArtefactDto): boolean {
    const isMulti = Array.isArray(data.artefact_string_value) && Array.isArray(data.artefact_value_id);

    this.logger.info('Checking artefact type', 'ПроверкаТипаАртефакта', {
      model_id: data.model_id,
      artefact_tech_label: data.artefact_tech_label,
      is_multi_dropdown: isMulti,
      artefact_string_value_type: typeof data.artefact_string_value,
      artefact_value_id_type: typeof data.artefact_value_id
    });

    return isMulti;
  }

  async updateMultiDropdownArtefact(artefactData: MultiDropdownArtefact): Promise<boolean> {
    this.logger.info('Updating multi-dropdown artefact', 'ОбновлениеМультиВыпадающегоАртефакта', {
      model_id: artefactData.model_id,
      artefact_tech_label: artefactData.artefact_tech_label,
      values_count: artefactData.artefact_string_value?.length || 0
    });

    const { model_id, artefact_tech_label, artefact_string_value, artefact_value_id, creator } = artefactData

    try {
      const model = await this.getModelById(model_id)
      if (!model) {
        this.logger.warn('Model not found for multi-dropdown artefact update', 'МодельНеНайденаДляОбновленияМультиАртефакта', {
          model_id
        });
        return false
      }

      const artefact: ArtefactEntity | null = await this.getArtefactByTechLabel(artefact_tech_label)
      if (!artefact) {
        this.logger.warn('Artefact not found for update', 'АртефактНеНайденДляОбновления', {
          artefact_tech_label
        });
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

      this.logger.info('Multi-dropdown artefact changes calculated', 'ИзмененияМультиАртефактаРассчитаны', {
        model_id,
        artefact_id: artefact.artefact_id,
        add_candidates_count: addCandidates.length,
        delete_candidates_count: deleteCandidates?.length || 0,
        total_values: newArr.length
      });

      if (deleteCandidates) {
        this.logger.info('Deleting obsolete artefact realizations', 'УдалениеУстаревшихРеализацийАртефакта', {
          count: deleteCandidates.length
        });

        await deleteCandidates.reduce(async (prevPromise, item) => {
          await prevPromise;
          await this.setEffectiveToArtefactRealization(item, true)
        }, Promise.resolve())
      }

      if (addCandidates.length) {
        this.logger.info('Adding new artefact realizations', 'ДобавлениеНовыхРеализацийАртефакта', {
          count: addCandidates.length
        });

        await addCandidates.reduce(async (prevPromise, item) => {
          await prevPromise;
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

      this.logger.info('Multi-dropdown artefact update completed successfully', 'ОбновлениеМультиАртефактаУспешноЗавершено', {
        model_id,
        artefact_tech_label,
        artefact_id: artefact.artefact_id
      });

      return true
    } catch (error) {
      this.logger.error('Error updating multi-dropdown artefact', 'ОшибкаОбновленияМультиВыпадающегоАртефакта', error, {
        model_id: artefactData.model_id,
        artefact_tech_label: artefactData.artefact_tech_label
      });
      return false;
    }
  }

  async updateArtefact(artefactData: SingleValueArtefact): Promise<boolean> {
    this.logger.info('Updating single value artefact', 'ОбновлениеОднозначногоАртефакта', {
      model_id: artefactData.model_id,
      artefact_tech_label: artefactData.artefact_tech_label,
      artefact_string_value: artefactData.artefact_string_value,
      artefact_value_id: artefactData.artefact_value_id
    });

    const { model_id, artefact_tech_label, artefact_string_value, creator } = artefactData

    try {
      const model = await this.getModelById(model_id)
      if (!model) {
        this.logger.warn('Model not found for artefact update', 'МодельНеНайденаДляОбновленияАртефакта', {
          model_id
        });
        return false
      }

      const artefact: ArtefactEntity | null = await this.getArtefactByTechLabel(artefact_tech_label)
      if (!artefact) {
        this.logger.warn('Artefact not found', 'АртефактНеНайден', {
          artefact_tech_label
        });
        return false
      }

      const isSelectType: boolean = ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id)
      const artefactValues: ArtefactValueEntity[] | null = isSelectType ? await this.getArtefactValues(artefact.artefact_id) : null
      const resolvedArtefactValueId = this.resolveArtefactValueId(artefactData, artefactValues)
      const latestArtefactRealization: ArtefactRealizationEntity | null = await this.getLatestArtefactRealization(model_id, artefact.artefact_id)

      this.logger.info('Artefact update parameters resolved', 'ПараметрыОбновленияАртефактаРассчитаны', {
        model_id,
        artefact_id: artefact.artefact_id,
        is_select_type: isSelectType,
        resolved_artefact_value_id: resolvedArtefactValueId,
        has_latest_realization: !!latestArtefactRealization
      });

      if (this.shouldSkipUpdate(latestArtefactRealization, resolvedArtefactValueId, artefact_string_value, isSelectType)) {
        this.logger.info('Skipping artefact update - no changes detected', 'ПропускОбновленияАртефактаИзмененийНеОбнаружено', {
          model_id,
          artefact_tech_label
        });
        return false
      }

      if (latestArtefactRealization) {
        this.logger.info('Setting effective_to for previous realization', 'УстановкаEffectiveToДляПредыдущейРеализации', {
          model_id,
          artefact_id: artefact.artefact_id
        });
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

      this.logger.info('Single value artefact update completed successfully', 'ОбновлениеОднозначногоАртефактаУспешноЗавершено', {
        model_id,
        artefact_tech_label,
        artefact_id: artefact.artefact_id
      });

      return true
    } catch (error) {
      this.logger.error('Error updating single value artefact', 'ОшибкаОбновленияОднозначногоАртефакта', error, {
        model_id: artefactData.model_id,
        artefact_tech_label: artefactData.artefact_tech_label
      });
      return false;
    }
  }

  //@TODO: вынести в модуль models
  async getModelById(model_id: UpdateArtefactDto['model_id']): Promise<any> {
    this.logger.info('Getting model by ID', 'ПолучениеМоделиПоИдентификатору', {
      model_id,
      table_name: this.modelsTableName
    });

    try {
      const [model] = await this.databaseService.query(
        `
        SELECT * FROM ${ this.modelsTableName } WHERE model_id = :model_id
        `,
        {
          model_id
        }
      )

      if (model) {
        this.logger.info('Model found successfully', 'МодельУспешноНайдена', {
          model_id,
          model_name: model.model_name
        });
      } else {
        this.logger.warn('Model not found', 'МодельНеНайдена', {
          model_id
        });
      }

      return model || null
    } catch (error) {
      this.logger.error('Error getting model by ID', 'ОшибкаПолученияМоделиПоИдентификатору', error, {
        model_id
      });
      throw error;
    }
  }

  async getArtefactByTechLabel(artefact_tech_label: UpdateArtefactDto['artefact_tech_label']): Promise<ArtefactEntity | null> {
    this.logger.info('Getting artefact by technical label', 'ПолучениеАртефактаПоТехническомуЯрлыку', {
      artefact_tech_label,
      table_name: this.artefactsTableName
    });

    try {
      const [artefact] = await this.databaseService.query(
        `
        SELECT * FROM ${ this.artefactsTableName } WHERE artefact_tech_label = :artefact_tech_label
        `,
        {
          artefact_tech_label
        }
      )

      if (artefact) {
        this.logger.info('Artefact found successfully', 'АртефактУспешноНайден', {
          artefact_tech_label,
          artefact_id: artefact.artefact_id,
          artefact_type_id: artefact.artefact_type_id
        });
      } else {
        this.logger.warn('Artefact not found', 'АртефактНеНайден', {
          artefact_tech_label
        });
      }

      return artefact || null
    } catch (error) {
      this.logger.error('Error getting artefact by technical label', 'ОшибкаПолученияАртефактаПоТехническомуЯрлыку', error, {
        artefact_tech_label
      });
      throw error;
    }
  }

  async getArtefactValues(artefact_id: ArtefactEntity['artefact_id']): Promise<ArtefactValueEntity[]> {
    this.logger.info('Getting artefact values', 'ПолучениеЗначенийАртефакта', {
      artefact_id,
      table_name: this.artefactValuesTableName
    });

    try {
      const artefactValues = await this.databaseService.query(
        `
        SELECT * FROM ${ this.artefactValuesTableName } WHERE artefact_id = :artefact_id
        `,
        {
          artefact_id
        }
      )

      this.logger.info('Artefact values retrieved successfully', 'ЗначенияАртефактаУспешноПолучены', {
        artefact_id,
        values_count: artefactValues.length
      });

      return artefactValues || null
    } catch (error) {
      this.logger.error('Error getting artefact values', 'ОшибкаПолученияЗначенийАртефакта', error, {
        artefact_id
      });
      throw error;
    }
  }

  async getLatestArtefactRealization(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity | null> {
    this.logger.info('Getting latest artefact realization', 'ПолучениеПоследнейРеализацииАртефакта', {
      model_id,
      artefact_id,
      table_name: this.artefactRealizationsTableName
    });

    try {
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

      if (artefactRealization) {
        this.logger.info('Latest artefact realization found', 'ПоследняяРеализацияАртефактаНайдена', {
          model_id,
          artefact_id,
          effective_from: artefactRealization.effective_from,
          effective_to: artefactRealization.effective_to
        });
      } else {
        this.logger.info('No artefact realization found', 'РеализацияАртефактаНеНайдена', {
          model_id,
          artefact_id
        });
      }

      return artefactRealization || null
    } catch (error) {
      this.logger.error('Error getting latest artefact realization', 'ОшибкаПолученияПоследнейРеализацииАртефакта', error, {
        model_id,
        artefact_id
      });
      throw error;
    }
  }

  async getLatestArtefactRealizations(
    model_id: string,
    artefact_id: ArtefactEntity['artefact_id']
  ): Promise<ArtefactRealizationEntity[] | null> {
    this.logger.info('Getting latest artefact realizations', 'ПолучениеПоследнихРеализацийАртефакта', {
      model_id,
      artefact_id,
      table_name: this.artefactRealizationsTableName
    });

    try {
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

      this.logger.info('Latest artefact realizations retrieved', 'ПоследниеРеализацииАртефактаПолучены', {
        model_id,
        artefact_id,
        realizations_count: artefactRealizations.length
      });

      return artefactRealizations.length ? artefactRealizations : null
    } catch (error) {
      this.logger.error('Error getting latest artefact realizations', 'ОшибкаПолученияПоследнихРеализацийАртефакта', error, {
        model_id,
        artefact_id
      });
      throw error;
    }
  }

  async setEffectiveToArtefactRealization(
    latestArtefactRealization: ArtefactRealizationEntity,
    isSelectType: boolean
  ): Promise<void> {
    this.logger.info('Setting effective_to for artefact realization', 'УстановкаEffectiveToДляРеализацииАртефакта', {
      model_id: latestArtefactRealization.model_id,
      artefact_id: latestArtefactRealization.artefact_id,
      artefact_value_id: latestArtefactRealization.artefact_value_id,
      is_select_type: isSelectType
    });

    try {
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

      this.logger.info('Effective_to set successfully', 'EffectiveToУспешноУстановлен', {
        model_id: latestArtefactRealization.model_id,
        artefact_id: latestArtefactRealization.artefact_id
      });
    } catch (error) {
      this.logger.error('Error setting effective_to for artefact realization', 'ОшибкаУстановкиEffectiveToДляРеализацииАртефакта', error, {
        model_id: latestArtefactRealization.model_id,
        artefact_id: latestArtefactRealization.artefact_id
      });
      throw error;
    }
  }

  resolveArtefactValueId(
    artefactData: SingleValueArtefact,
    artefactValues: ArtefactValueEntity[] | null
  ): number | null {
    this.logger.info('Resolving artefact value ID', 'РазрешениеИдентификатораЗначенияАртефакта', {
      artefact_string_value: artefactData.artefact_string_value,
      artefact_value_id: artefactData.artefact_value_id,
      has_artefact_values: !!artefactValues,
      artefact_values_count: artefactValues?.length || 0
    });

    const { artefact_value_id, artefact_string_value } = artefactData

    if (!artefactValues) {
      this.logger.info('No artefact values available, returning original value_id', 'ЗначенияАртефактаНеДоступныВозвратОригинальногоИдентификатора', {
        artefact_value_id
      });
      return artefact_value_id
    }

    const matchingValue = artefactValues.find(value => value.artefact_value_id === artefact_value_id)
    if (matchingValue) {
      this.logger.info('Found matching value by ID', 'НайденоСоответствиеПоИдентификатору', {
        artefact_value_id,
        artefact_value: matchingValue.artefact_value
      });
      return artefact_value_id
    }

    const valueByString = artefactValues.find(value => value.artefact_value.toLowerCase() === artefact_string_value.toLowerCase())
    if (valueByString) {
      this.logger.info('Found matching value by string', 'НайденоСоответствиеПоСтроке', {
        artefact_string_value,
        resolved_artefact_value_id: valueByString.artefact_value_id,
        artefact_value: valueByString.artefact_value
      });
      return valueByString.artefact_value_id
    }

    this.logger.warn('No matching artefact value found, returning original value_id', 'СоответствующееЗначениеАртефактаНеНайденоВозвратОригинальногоИдентификатора', {
      artefact_value_id,
      artefact_string_value
    });

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
    this.logger.info('Inserting artefact realization', 'ДобавлениеРеализацииАртефакта', {
      model_id,
      artefact_id,
      artefact_value_id,
      artefact_string_value,
      creator
    });

    try {
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

      this.logger.info('Artefact realization inserted successfully', 'РеализацияАртефактаУспешноДобавлена', {
        model_id,
        artefact_id,
        final_string_value: finalStringValue
      });
    } catch (error) {
      this.logger.error('Error inserting artefact realization', 'ОшибкаДобавленияРеализацииАртефакта', error, {
        model_id,
        artefact_id,
        artefact_value_id
      });
      throw error;
    }
  }

  async getMaxArtefactUpdateDate(model_id: string): Promise<any> {
    this.logger.info('Getting max artefact update date', 'ПолучениеМаксимальнойДатыОбновленияАртефакта', {
      model_id
    });

    try {
      const result = await this.databaseService.query(
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

      this.logger.info('Max artefact update date retrieved', 'МаксимальнаяДатаОбновленияАртефактаПолучена', {
        model_id,
        update_date: result[0]?.update_date || null
      });

      return result;
    } catch (error) {
      this.logger.error('Error getting max artefact update date', 'ОшибкаПолученияМаксимальнойДатыОбновленияАртефакта', error, {
        model_id
      });
      throw error;
    }
  }

  canEditArtefact(artefact: ArtefactEntity): boolean {
    const canEdit = false;

    this.logger.info('Checking if artefact can be edited', 'ПроверкаВозможностиРедактированияАртефакта', {
      artefact_id: artefact.artefact_id,
      artefact_tech_label: artefact.artefact_tech_label,
      is_edit_flg: artefact.is_edit_flg,
      can_edit: canEdit
    });

    return canEdit;
  }

  canEditArtefactBySource(
    artefact: ArtefactEntity,
    user: UserType,
    artefactRolesMap: Map<number, { sum: string[], sum_rm: string[] }>
  ): { is_editable_by_role_sum: string, is_editable_by_role_sum_rm: string } {
    this.logger.info('Checking artefact edit permissions by source', 'ПроверкаПравРедактированияАртефактаПоИсточнику', {
      artefact_id: artefact.artefact_id,
      artefact_tech_label: artefact.artefact_tech_label,
      is_edit_flg: artefact.is_edit_flg,
      user_groups: user.groups
    });

    if (artefact.is_edit_flg === '0') {
      this.logger.info('Artefact editing disabled by flag', 'РедактированиеАртефактаОтключеноФлагом', {
        artefact_id: artefact.artefact_id
      });
      return { is_editable_by_role_sum: '0', is_editable_by_role_sum_rm: '0' };
    }

    const rolesForArtefact = artefactRolesMap.get(artefact.artefact_id) || { sum: [], sum_rm: [] };

    const isEditableSum = rolesForArtefact.sum.length > 0 && user.groups.some((role) => rolesForArtefact.sum.includes(role));
    const isEditableSumRm = rolesForArtefact.sum_rm.length > 0 && user.groups.some((role) => rolesForArtefact.sum_rm.includes(role));

    const result = {
      is_editable_by_role_sum: isEditableSum ? '1' : '0',
      is_editable_by_role_sum_rm: isEditableSumRm ? '1' : '0',
    };

    this.logger.info('Artefact edit permissions determined', 'ПраваРедактированияАртефактаОпределены', {
      artefact_id: artefact.artefact_id,
      ...result,
      sum_roles: rolesForArtefact.sum,
      sum_rm_roles: rolesForArtefact.sum_rm
    });

    return result;
  }

  private shouldSkipUpdate(
    latestArtefactRealization: ArtefactRealizationEntity | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value'],
    isSelectType: boolean
  ): boolean {
    if (!latestArtefactRealization) {
      this.logger.info('No latest realization found, update required', 'ПоследняяРеализацияНеНайденаТребуетсяОбновление');
      return false;
    }

    let shouldSkip = false;
    let reason = '';

    if (isSelectType && latestArtefactRealization.artefact_value_id === artefact_value_id) {
      shouldSkip = true;
      reason = 'artefact_value_id unchanged for select type';
    } else if (!isSelectType && latestArtefactRealization.artefact_string_value === artefact_string_value) {
      shouldSkip = true;
      reason = 'artefact_string_value unchanged for non-select type';
    }

    if (shouldSkip) {
      this.logger.info('Skipping artefact update', 'ПропускОбновленияАртефакта', {
        reason,
        is_select_type: isSelectType,
        current_value_id: latestArtefactRealization.artefact_value_id,
        new_value_id: artefact_value_id,
        current_string_value: latestArtefactRealization.artefact_string_value,
        new_string_value: artefact_string_value
      });
    }

    return shouldSkip;
  }

  private determineFinalStringValue(
    artefact: ArtefactEntity,
    artefactValues: ArtefactValueEntity[] | null,
    artefact_value_id: ArtefactValueEntity['artefact_value_id'] | null,
    artefact_string_value: ArtefactRealizationEntity['artefact_string_value']
  ): string | null {
    this.logger.info('Determining final string value', 'ОпределениеФинальногоСтроковогоЗначения', {
      artefact_id: artefact.artefact_id,
      artefact_type_id: artefact.artefact_type_id,
      requires_values: ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id),
      has_artefact_values: !!artefactValues,
      artefact_value_id,
      artefact_string_value
    });

    if (ARTEFACT_TYPES_REQUIRING_VALUES.has(artefact.artefact_type_id) && artefactValues) {
      const value = artefactValues.find(val => val.artefact_value_id === artefact_value_id);
      const result = value ? value.artefact_value : null;

      this.logger.info('Final string value determined from artefact values', 'ФинальноеСтроковоеЗначениеОпределеноИзЗначенийАртефакта', {
        artefact_id: artefact.artefact_id,
        artefact_value_id,
        final_string_value: result
      });

      return result;
    }

    this.logger.info('Final string value using original string value', 'ФинальноеСтроковоеЗначениеИспользуетОригинальноеЗначение', {
      artefact_id: artefact.artefact_id,
      final_string_value: artefact_string_value
    });

    return artefact_string_value;
  }
}
