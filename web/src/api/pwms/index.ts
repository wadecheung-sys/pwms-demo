import { appConfig } from '@/config/env'

export type ApiMode = 'mock' | 'http'

export function getApiMode(): ApiMode {
  return appConfig.useMock ? 'mock' : 'http'
}

export { appConfig }
export { useDataStore } from '@/stores/data'
export { API } from './endpoints'
export * as httpProvider from './httpProvider'
export { ApiError } from './http'
