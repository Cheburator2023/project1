declare module 'cache-manager' {
  export interface Cache {
    get<T>(key: string): Promise<T | undefined>
    set<T>(key: string, value: T, ttl?: number): Promise<void>
    del(key: string): Promise<void>
    reset(): Promise<void>
    keys(): Promise<string[]>
    ttl(key: string): Promise<number>
    wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>
  }

  export interface CacheOptions {
    ttl?: number
    max?: number
    store?: string | CacheStore
  }

  export interface CacheStore {
    get<T>(key: string): Promise<T | undefined>
    set<T>(key: string, value: T, ttl?: number): Promise<void>
    del(key: string): Promise<void>
    reset(): Promise<void>
    keys(): Promise<string[]>
    ttl(key: string): Promise<number>
  }

  export function caching(options: CacheOptions): Cache
  export function multiCaching(caches: Cache[]): Cache
}
