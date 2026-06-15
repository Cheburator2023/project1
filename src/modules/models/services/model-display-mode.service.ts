import { Injectable } from '@nestjs/common'
import {
  MODEL_DISPLAY_MODES,
  MODEL_SOURCES,
  MODEL_STATUS
} from 'src/system/common/constants'

type DisplayModeModel = {
  model_source?: string | null
  model_status?: string | null
  delete_status?: string | null
}

@Injectable()
export class ModelDisplayModeService {
  getDisplayMode(model: DisplayModeModel): string | null {
    if (this.isCreationError(model)) {
      return MODEL_DISPLAY_MODES.CREATION_ERROR
    }

    if (this.isPendingDelete(model)) {
      return MODEL_DISPLAY_MODES.PENDING_DELETE
    }

    if (this.isArchived(model)) {
      return MODEL_DISPLAY_MODES.ARCHIVE
    }

    if (this.isActive(model)) {
      return MODEL_DISPLAY_MODES.ACTIVE
    }

    return null
  }

  filterModels<T extends DisplayModeModel>(
    models: T[],
    mode: string[] | null
  ): T[] {
    const selected = new Set(mode ?? [])
    if (selected.size === 0) return []

    return models.filter((model) => {
      const displayMode = this.getDisplayMode(model)
      return displayMode ? selected.has(displayMode) : false
    })
  }

  isArchived(model: DisplayModeModel): boolean {
    return model.model_status === MODEL_STATUS.ARCHIVE
  }

  isPendingDelete(model: DisplayModeModel): boolean {
    return (
      model.model_source === MODEL_SOURCES.MRM &&
      model.delete_status === MODEL_STATUS.PENDING_DELETE
    )
  }

  isCreationError(model: DisplayModeModel): boolean {
    return (
      model.model_source === MODEL_SOURCES.MRM &&
      model.delete_status === MODEL_STATUS.CREATION_ERROR
    )
  }

  isActive(model: DisplayModeModel): boolean {
    return (
      !this.isArchived(model) &&
      !this.isPendingDelete(model) &&
      !this.isCreationError(model)
    )
  }
}
