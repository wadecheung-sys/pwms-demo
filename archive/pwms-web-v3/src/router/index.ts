import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { canAccessMenuPath } from '@/utils/permission'
import { menuRoutes } from './menu'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: { title: '登录', hidden: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/dashboard',
      children: menuRoutes.map((route) => ({
        ...route,
        name: route.path.replace(/^\//, '').replace(/\//g, '-') || 'root',
      })),
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.path !== '/login' && !userStore.isLoggedIn()) {
    return '/login'
  }
  if (to.path === '/login' && userStore.isLoggedIn()) {
    return '/dashboard'
  }
  if (to.path !== '/login' && !canAccessMenuPath(to.path, userStore.context)) {
    return '/dashboard'
  }
})

export default router
