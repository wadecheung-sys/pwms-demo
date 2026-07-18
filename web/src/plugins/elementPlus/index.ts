import type { App } from 'vue'
import ElementPlus from 'element-plus'
import { ElLoading, ElScrollbar } from 'element-plus'

const plugins = [ElLoading]
const components = [ElScrollbar]

export const setupElementPlus = (app: App<Element>) => {
  // 业务页大量直接使用 el-*，全量注册组件，避免按需未解析导致白屏/残缺
  if (import.meta.env.VITE_USE_ALL_ELEMENT_PLUS_STYLE === 'true') {
    import('element-plus/dist/index.css')
    app.use(ElementPlus)
    return
  }

  plugins.forEach((plugin) => {
    app.use(plugin)
  })

  components.forEach((component) => {
    app.component(component.name!, component)
  })
}
