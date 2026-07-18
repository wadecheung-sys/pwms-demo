export const appConfig = {
  /** true=本地数据层；false=请求后端 API */
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  appTitle: '智慧化生产专业仓管理系统',
  version: 'v3.0',
}
