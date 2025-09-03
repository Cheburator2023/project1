import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import { UpdateArtefactDto } from '../dto'
import { MODEL_SOURCES } from 'src/system/common/constants'

interface ArtefactUpdateContext {
  artefactsBatch: UpdateArtefactDto[]
  modelSource: MODEL_SOURCES
}

@Injectable()
export class ArtefactExecutionContextService {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<ArtefactUpdateContext>()

  runWithContext<T>(
    context: ArtefactUpdateContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.asyncLocalStorage.run(context, fn)
  }

  getBatch(): UpdateArtefactDto[] {
    const store = this.asyncLocalStorage.getStore()

    if (!store) {
      throw new Error('ArtefactUpdateContext is not set')
    }
    return store.artefactsBatch
  }

  getModelSource(): MODEL_SOURCES {
    const store = this.asyncLocalStorage.getStore()

    if (!store) {
      throw new Error('ArtefactUpdateContext is not set')
    }
    return store.modelSource
  }
}
