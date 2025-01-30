export type ArtefactEntity = {
  artefact_id: number;
  artefact_tech_label: string;
  artefact_label: string;
  artefact_desc: string;
  artefact_context: string;
  is_main_info_flg: string;
  is_class_flg: string;
  is_edit_flg: string;
  is_edit_sum_flg: string;
  is_edit_for_business_creator_flg: string;
  artefact_type_id: number;
  artefact_business_group_id: number;
  is_multi_fill_flg: string;
  artefact_parent_id: number;
  artefact_parent_value: string;
  artefact_default_value: string;
  is_default_value_flg: string;
  artefact_hint: string;
  artefact_regular_expression: string;
}