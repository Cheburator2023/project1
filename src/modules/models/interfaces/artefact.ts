interface Artefact {
  artefact_id: number;
  artefact_tech_label: string;
  artefact_label: string;
  is_edit_flg: string;
  artefact_desc: string;
  artefact_type_id: string;
  artefact_type_desc: string;
  values: ArtefactValue[];
  group?: string;
  start_date_depend_artefact?: string;
}

interface ArtefactValue {
  artefact_id: number;
  is_active_flag: string;
  artefact_parent_value_id: number | null;
  artefact_value_id: number;
  artefact_value: string;
}

export { Artefact, ArtefactValue }
