import { Injectable } from '@nestjs/common'
import { DEFAULT_ARTEFACTS_ON_CREATE } from '../constants/artefact-defaults.constants'
import { UpdateArtefactDto } from 'src/modules/artefacts/dto'

type DefaultArtefactInput = UpdateArtefactDto

@Injectable()
export class ModelDefaultsService {
  constructor() {}

  async applyDefaultsOnCreate(
    model_id: string,
    inputArtefacts: Array<{ artefact_tech_label: string; artefact_string_value: string | number | null }>
  ): Promise<DefaultArtefactInput[]> {
    const additions: DefaultArtefactInput[] = []

    for (const def of DEFAULT_ARTEFACTS_ON_CREATE) {
      const provided = inputArtefacts.some(
        (a) => a.artefact_tech_label === def.artefact_tech_label && String(a.artefact_string_value ?? '').trim() !== ''
      )
      if (provided) continue

      // No DB checks on create; rely solely on client payload

      additions.push({
        model_id,
        artefact_tech_label: def.artefact_tech_label,
        artefact_string_value: def.default_string_value,
        artefact_value_id: null,
        creator: ''
      })
    }

    return additions
  }
}


