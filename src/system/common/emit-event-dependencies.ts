import { DebounceService } from '../../debounce/debounce.service'

export class EmitEventDependencies {
  private static debounceService: DebounceService

  static initialize(debounceService: DebounceService) {
    this.debounceService = debounceService
  }

  static getDebounceService(): DebounceService {
    return this.debounceService
  }
}
