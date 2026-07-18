import { appConfig } from '@/config/env'

export type ApiMode = 'mock' | 'http'

export function getApiMode(): ApiMode {
  return appConfig.useMock ? 'mock' : 'http'
}

export { appConfig }
export { useDataStore } from '@/stores/data'
export { API } from '@/api/endpoints'
export * as httpProvider from '@/api/httpProvider'
export { ApiError } from '@/api/http'
