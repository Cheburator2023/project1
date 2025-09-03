import { Artefact } from './artefact'

interface Model {
  [key: string]: any
}

interface GroupedResults {
  [key: string]: Model[]
}

interface ModelType {
  id: number
  name: string
}

interface ModelRelationsResponse {
  data: {
    card: Model & {
      modules: Model[]
      calibrations: Model[]
      [key: string]: Model[]
    }
  }
}

interface PreparedArtefactsResult {
  data: Artefact[]
}

export {
  Model,
  GroupedResults,
  ModelType,
  ModelRelationsResponse,
  PreparedArtefactsResult
}
