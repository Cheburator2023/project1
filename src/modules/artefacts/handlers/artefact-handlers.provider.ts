import { ArtefactRatingModelHandler } from './artefact-rating-model.handler'
import { ArtefactClassificationHandler } from './artefact-classification.handler'
import { ArtefactModelIdHandler } from './artefact-model-id.handler'

export const artefactHandlersProvider = [
  ArtefactRatingModelHandler,
  ArtefactClassificationHandler,
  ArtefactModelIdHandler
]
