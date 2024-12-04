import { CamundaTask } from '../entities'

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
}
