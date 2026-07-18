import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const globalLoading = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  async function withLoading<T>(fn: () => T | Promise<T>): Promise<T> {
    globalLoading.value = true
    try {
      return await fn()
    } finally {
      globalLoading.value = false
    }
  }

  return { sidebarCollapsed, globalLoading, toggleSidebar, withLoading }
})
