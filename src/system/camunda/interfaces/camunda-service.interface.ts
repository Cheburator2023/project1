import {
  CamundaProcessDefinition,
  CamundaProcessInstance,
  CamundaTask
} from '../entities'

/**
 * Interface for interacting with the Camunda API.
 */
export interface ICamundaService {
  /**
   * Retrieves a list of tasks filtered by candidate groups (roles).
   *
   * @param groups - An array of groups used to filter tasks.
   * @returns A promise that resolves to an array of CamundaTask objects.
   */
  getTasksByGroups(groups?: string[]): Promise<CamundaTask[]>

  /**
   * Retrieves a list of process instances by model ID in it's variables.
   *
   * @param modelId
   * @returns A promise that resolves to an array of CamundaProcessInstance objects.
   */
  getProcessInstancesByModel(modelId: string): Promise<CamundaProcessInstance[]>

  /**
   * Retrieves a process definition according to the ProcessDefinition interface in the engine.
   *
   * @param processDefinitionId
   * @returns A promise that resolves to a CamundaProcessDefinition object.
   */
  getProcessDefinitionById(
    processDefinitionId: string
  ): Promise<CamundaProcessDefinition>
}
