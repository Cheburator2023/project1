import { ArtefactEntity } from './artefact.entity'

export interface EnrichedArtefact extends ArtefactEntity {
  is_editable_by_role_sum: string
  is_editable_by_role_sum_rm: string
}
