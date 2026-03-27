import { Injectable, NotFoundException } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { BaseArtefactService } from './base-artefact.service'
import {
  SUM_TABLES,
  ALWAYS_ALLOWED_ARTEFACTS,
  INTEGRATION_MODEL_ARTEFACTS,
  TEST_PREPROD_TRANSFER_PROD_ARTEFACTS,
  MODEL_FINAL_STATUSES,
  SPECIAL_SCHEMAS_VERSION_TAGS,
  ALWAYS_ALLOWED_TASKS,
  MAPPED_ARTEFACTS
} from '../constants'
import { IArtefactService } from '../interfaces'
import { LoggerService } from 'src/system/logger/logger.service'
import { CamundaService } from 'src/system/camunda/camunda.service'

@Injectable()
export class SumArtefactService
  extends BaseArtefactService
  implements IArtefactService
{
  protected modelsTableName = SUM_TABLES.MODELS
  protected artefactsTableName = SUM_TABLES.ARTEFACTS
  protected artefactValuesTableName = SUM_TABLES.ARTEFACT_VALUES
  protected artefactRealizationsTableName = SUM_TABLES.ARTEFACT_REALIZATIONS

  constructor(
    databaseService: SumDatabaseService,
    logger: LoggerService,
    protected readonly camundaService: CamundaService
  ) {
    super(databaseService, logger)
  }

  async getBlockListByModel(modelId: string): Promise<{ data: string[] }> {
    this.logger.info(
      'Getting blocked artefacts list',
      'ПолучениеСпискаЗаблокированныхАртефактов'
    )

    let artefactExceptions = [...ALWAYS_ALLOWED_ARTEFACTS]

    try {
      const [model] = await this.databaseService.query(
        `select * from models where model_id = :model_id`,
        { model_id: modelId }
      )

      if (!model) {
        throw new NotFoundException(`Model with id ${modelId} not found`)
      }

      // Если у модели финальный статус или статус не определён, проверяем входит ли схема процесса в исключения
      if (
        !model.model_status ||
        MODEL_FINAL_STATUSES.includes(model.model_status)
      ) {
        // Получаем version tag схемы текущей модели через process instance
        const processInstances =
          await this.camundaService.getProcessInstancesByModel(modelId)

        if (processInstances.length) {
          const processDefinition =
            await this.camundaService.getProcessDefinitionById(
              processInstances[0].definitionId
            )

          // Если в схеме отсутствуют процессы INTEGRATION_MODEL и TEST_PREPROD_TRANSFER_PROD
          if (
            SPECIAL_SCHEMAS_VERSION_TAGS.includes(processDefinition.versionTag)
          ) {
            // Добавляем в исключения все артефакты с отсутствующих в схеме процессов
            artefactExceptions = [
              ...artefactExceptions,
              ...INTEGRATION_MODEL_ARTEFACTS,
              ...TEST_PREPROD_TRANSFER_PROD_ARTEFACTS
            ]
          }
        }
      }

      // Получаем лог задач по модели
      const operationsLogQueryResult = await this.databaseService.query(
        `select tol.task_id, tol.task_id_rolled_back_from, tol.operation, tol.create_date
          from tasks_operations_logs tol
          where model_id = :model_id
          order by create_date asc`,
        { model_id: modelId }
      )

      let completedTasksList = []

      // Собираем список user task со статусом complete
      for (const operation of operationsLogQueryResult) {
        if (operation.operation === 'complete') {
          completedTasksList.push(operation.task_id)
        } else if (operation.operation === 'rollback') {
          const rolledBackIndex = completedTasksList.findIndex(
            (el) => el === operation.task_id
          )
          if (rolledBackIndex >= 0) {
            completedTasksList = completedTasksList.slice(0, rolledBackIndex)
          }
        }
      }

      // Добавляем в качестве исключений таски, атрибуты которых блокировать не нужно
      completedTasksList = [...completedTasksList, ...ALWAYS_ALLOWED_TASKS]

      // Получаем все атрибуты, которые не встречаются в вычисленных complete задачах, и пропускаем исключения
      const artefactsQueryResult = await this.databaseService.query(
        `select distinct on (a.artefact_id) ta.task_id, a.artefact_id, a.artefact_tech_label from tasks_artefacts ta 
          join artefacts a on a.artefact_id = ta.artefact_id 
          where ta.task_id <> all (:task_ids::text[]) 
            and a.artefact_tech_label <> all (:artefact_tech_labels::text[]) 
            and ta.deployment_id = :deployment_id`,
        {
          task_ids: completedTasksList,
          artefact_tech_labels: artefactExceptions,
          deployment_id: model.deployment_id
        }
      )

      this.logger.info(
        'Blocked artefacts list retrieved successfully',
        'СписокЗаблокированныхАртефактовУспешноПолучен',
        {
          operations_log_count: operationsLogQueryResult.length,
          database_artefacts_count: artefactsQueryResult.length
        }
      )

      return {
        data: artefactsQueryResult.map((item) => {
          // Некоторые артефакты могут иметь различные artefact_tech_label в СУМ и РМ. Если есть в маппинге, то подменяем
          return item.artefact_tech_label in MAPPED_ARTEFACTS
            ? MAPPED_ARTEFACTS[item.artefact_tech_label]
            : item.artefact_tech_label
        })
      }
    } catch (error) {
      this.logger.error(
        'Error getting blocked artefacts list',
        'ОшибкаПолученияСпискаЗаблокированныхАртефактов',
        error
      )
      throw error
    }
  }
}
