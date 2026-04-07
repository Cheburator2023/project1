import {
  MODEL_STAGES,
  MODEL_STAGES_DESCRIPTION,
  MODEL_SOURCES,
  MODEL_STATUS
} from 'src/system/common/constants'

type DisplayModeModel = {
  model_source?: string | null
  model_status?: string | null
  model_stage?: string | null
  delete_status?: string | null
  models_is_active_flg?: string | null
}

export const splitModelStages = (
  modelStage?: string | null
): string[] =>
  typeof modelStage === 'string'
    ? modelStage
        .split(';')
        .map((stage) => stage.trim())
        .filter(Boolean)
    : []

export const isArchivedModel = (model: DisplayModeModel): boolean => {
  const stages = splitModelStages(model.model_stage)

  return (
    model.model_status === MODEL_STATUS.ARCHIVE ||
    stages.includes(MODEL_STAGES_DESCRIPTION[MODEL_STAGES.REMOVAL])
  )
}

export const isPendingDeleteModel = (model: DisplayModeModel): boolean =>
  model.model_source === MODEL_SOURCES.MRM &&
  model.delete_status === MODEL_STATUS.PENDING_DELETE

export const isCreationErrorModel = (model: DisplayModeModel): boolean =>
  model.delete_status === MODEL_STATUS.CREATION_ERROR ||
  model.model_status === MODEL_STATUS.CREATION_ERROR

export const isActiveModelForDisplay = (model: DisplayModeModel): boolean =>
  !isArchivedModel(model) &&
  !isPendingDeleteModel(model) &&
  !isCreationErrorModel(model)
