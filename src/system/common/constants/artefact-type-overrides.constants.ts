type ArtefactTypeOverride = {
  artefact_type_id: number
  artefact_type_desc: string
}

const ARTEFACT_TYPE_OVERRIDES_BY_TECH_LABEL: Record<
  string,
  ArtefactTypeOverride
> = {
  remove_date_validation: {
    artefact_type_id: 1,
    artefact_type_desc: 'text'
  }
}

const applyArtefactTypeOverrides = <
  T extends { artefact_tech_label?: string | null }
>(
  artefact: T
): T => {
  const techLabel = artefact.artefact_tech_label
  const override = techLabel
    ? ARTEFACT_TYPE_OVERRIDES_BY_TECH_LABEL[techLabel]
    : null

  return override ? { ...artefact, ...override } : artefact
}

export { ARTEFACT_TYPE_OVERRIDES_BY_TECH_LABEL, applyArtefactTypeOverrides }
