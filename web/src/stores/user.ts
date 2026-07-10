import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('pwms_token'))
  const username = ref(localStorage.getItem('pwms_username') || '')
  const displayName = ref(localStorage.getItem('pwms_display_name') || '')

  function login(user: string, password: string): boolean {
    if (user === 'admin' && password === '123456') {
      token.value = 'demo-token'
      username.value = user
      displayName.value = '系统管理员'
      localStorage.setItem('pwms_token', token.value)
      localStorage.setItem('pwms_username', user)
      localStorage.setItem('pwms_display_name', displayName.value)
      return true
    }
    return false
  }

  function logout() {
    token.value = null
    username.value = ''
    displayName.value = ''
    localStorage.removeItem('pwms_token')
    localStorage.removeItem('pwms_username')
    localStorage.removeItem('pwms_display_name')
  }

  const isLoggedIn = () => !!token.value

  return { token, username, displayName, login, logout, isLoggedIn }
})
