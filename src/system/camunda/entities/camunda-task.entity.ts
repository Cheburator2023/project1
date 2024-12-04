/**
 * Represents a task retrieved from the Camunda API.
 */
export class CamundaTask {
  /**
   * The unique identifier of the task.
   */
  id: string

  /**
   * The name of the task.
   */
  name: string

  /**
   * The user assigned to the task, if any.
   */
  assignee: string | null

  /**
   * The creation date of the task.
   */
  created: string

  /**
   * The due date of the task, if any.
   */
  due: string | null

  /**
   * The priority of the task.
   */
  priority: number

  /**
   * The process instance ID associated with the task.
   */
  processInstanceId: string

  /**
   * The execution ID associated with the task.
   */
  executionId: string

  /**
   * The process definition ID of the task.
   */
  processDefinitionId: string

  /**
   * The task definition key.
   */
  taskDefinitionKey: string

  /**
   * The owner of the task, if specified.
   */
  owner: string | null

  /**
   * The form key associated with the task, if any.
   */
  formKey: string | null
}
