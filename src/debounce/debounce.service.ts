import { Injectable } from '@nestjs/common'

@Injectable()
export class DebounceService {
  private events = new Map<string, NodeJS.Timeout>()

  /**
   * Implements debounce logic
   * @param key A unique identifier for the debounce event
   * @param callback The function to be executed
   * @param delay The delay before execution (in milliseconds)
   */
  debounce(
    key: string,
    callback: () => void,
    delay: number
  ) {
    if (this.events.has(key)) {
      clearTimeout(this.events.get(key))
    }

    const timeout = setTimeout(() => {
      callback()
      this.events.delete(key)
    }, delay)

    this.events.set(key, timeout)
  }
}
