export const appConfig = {
  /** true=本地 Mock+localStorage；false=请求后端 API */
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  appTitle: '生产仓管理系统',
  version: 'v1.0',
}
