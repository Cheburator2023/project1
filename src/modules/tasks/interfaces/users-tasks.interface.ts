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
};

export type Assignment = {
  model_id: string;
  model_name: string;
  root_model_id: string;
  model_version: string;
  update_date: string;
  status: string;
  assignee_name: string;
  functional_role: string;
};

export type AggregatedTask = {
  MODEL_ID: string;
  MODEL_NAME: string;
  MODEL_ALIAS: string;
  UPDATE_DATE: string;
  STATUS: string;
  TASK_NAMES: Set<string>;
  USER_NAMES: Set<string>;
  ASSIGNEES: Set<string>;
  STREAMS: Set<string>;
  ROLES: Set<string>;
  TASK_IDS: Set<string>
  ROLE: string;
  DS_STREAM: string | null;
  BPMN_KEY: string | null;
};
