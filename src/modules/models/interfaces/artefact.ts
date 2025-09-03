enum ArtefactTypeEnum {
  TEXT = 1,
  DROPDOWN = 3,
  DATE = 4,
  MULTI_DROPDOWN = 5,
  BOOLEAN = 6,
  PERCENTAGE = 16,
  QUARTERLY_DATE = 17,
  QUARTERLY_DROPDOWN = 19
}

type ArtefactTypeDescMap = {
  [key in ArtefactTypeEnum]: string
}

const artefactTypeDescMap: ArtefactTypeDescMap = {
  [ArtefactTypeEnum.TEXT]: 'text',
  [ArtefactTypeEnum.DROPDOWN]: 'dropdown',
  [ArtefactTypeEnum.DATE]: 'date',
  [ArtefactTypeEnum.MULTI_DROPDOWN]: 'multi-dropdown',
  [ArtefactTypeEnum.BOOLEAN]: 'boolean',
  [ArtefactTypeEnum.PERCENTAGE]: 'percentage',
  [ArtefactTypeEnum.QUARTERLY_DATE]: 'quarterly_date',
  [ArtefactTypeEnum.QUARTERLY_DROPDOWN]: 'quarterly_dropdown'
}

type ArtefactTypeId = ArtefactTypeEnum
type ArtefactTypeDesc = ArtefactTypeDescMap[ArtefactTypeEnum]

interface Artefact {
  artefact_id: number
  artefact_tech_label: string
  artefact_label: string
  is_edit_flg: string
  artefact_desc: string
  artefact_type_id: ArtefactTypeId
  artefact_type_desc: ArtefactTypeDesc
  values: ArtefactValue[]
  group?: string
  start_date_depend_artefact?: string
  is_edit_sum_flg?: string
  is_edit_for_business_creator_flg?: string
}

interface ArtefactValue {
  artefact_id: number
  is_active_flag: string
  artefact_parent_value_id: number | null
  artefact_value_id: number
  artefact_value: string
}

export {
  Artefact,
  ArtefactValue,
  ArtefactTypeEnum,
  artefactTypeDescMap,
  ArtefactTypeId
}
