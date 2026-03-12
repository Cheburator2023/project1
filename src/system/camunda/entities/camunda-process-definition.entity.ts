/**
 * Represents a process definition retrieved from the Camunda API.
 */
export class CamundaProcessDefinition {
  /**
   * The id of the process definition
   */
  id: string | null

  /**
   * The key of the process definition, i.e., the id of the BPMN 2.0 XML process definition.
   */
  key: string | null

  /**
   * The category of the process definition.
   */
  category: string | null

  /**
   * The description of the process definition.
   */
  description: string | null

  /**
   * The name of the process definition.
   */
  name: string | null

  /**
   * The version of the process definition that the engine assigned to it.
   */
  version: number | null

  /**
   * The file name of the process definition.
   */
  resource: string | null

  /**
   * The deployment id of the process definition.
   */
  deploymentId: string | null

  /**
   * The file name of the process definition diagram, if it exists.
   */
  diagram: string | null

  /**
   * A flag indicating whether the definition is suspended or not.
   */
  suspended: boolean | null

  /**
   * The tenant id of the process definition.
   */
  tenantId: string | null

  /**
   * The version tag of the process definition.
   */
  versionTag: string | null

  /**
   * History time to live value of the process definition. Is used within History cleanup.
   */
  historyTimeToLive: number | null

  /**
   * A flag indicating whether the process definition is startable in Tasklist or not.
   */
  startableInTasklist: boolean | null
}
