export type Model = {
  bpmn_key: string;
  system_model_id: string;
  ds_stream: string;
};

export type Task = {
  task_id?: string;
  role: string;
  model_id?: string;
  effective_from?: string;
  bpmn_key?: string;
  ds_stream?: string;
  update_date?: string;
  assignee?: string;
  name?: string;
  processInstanceId?: string
};

export interface Assignment {
  model_id: string;
  assignee_name: string;
  functional_role: string;
}

export interface RawCamundaTask {
  taskDefinitionKey: string;
  name: string;
  processInstanceId: string;
  assignee: string;
}