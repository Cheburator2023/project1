export type UpdateArtefactDto = {
  model_id: string
  artefact_tech_label: string
  artefact_string_value: string | string[]
  artefact_value_id: number | number[] | null
  creator: string
}

export type SingleValueArtefact = Omit<UpdateArtefactDto, 'artefact_string_value' | 'artefact_value_id'> & {
  artefact_string_value: string
  artefact_value_id: number | null
}

export type MultiDropdownArtefact = Omit<UpdateArtefactDto, 'artefact_string_value' | 'artefact_value_id'> & {
  artefact_string_value: string[]
  artefact_value_id: number[]
}
