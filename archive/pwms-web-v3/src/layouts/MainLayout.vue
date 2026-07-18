<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { menuRoutes } from '@/router/menu'
import { canAccessMenuPath, canAccessSystemChild } from '@/utils/permission'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)

const breadcrumbs = computed(() => {
  const matched = route.matched.filter((r) => r.meta?.title)
  return matched.map((r) => r.meta.title as string)
})

function handleLogout() {
  ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
    .then(() => {
      userStore.logout()
      router.push('/login')
    })
    .catch(() => {})
}

interface MenuRoute {
  path: string
  meta?: { title?: string; icon?: string }
  children?: MenuRoute[]
}

const menus = menuRoutes as MenuRoute[]

function resolvePath(base: string, childPath: string) {
  if (childPath.startsWith('/')) return childPath
  const b = base.replace(/\/$/, '')
  return `${b}/${childPath}`.replace(/\/+/g, '/')
}

function filterMenuTree(items: MenuRoute[], parentPath = ''): MenuRoute[] {
  return items
    .map((item) => {
      const fullPath = item.path.startsWith('/') ? item.path : resolvePath(parentPath, item.path)
      if (!canAccessMenuPath(fullPath, userStore.context)) return null

      if (!item.children?.length) return { ...item, path: fullPath }

      let children = item.children
      if (fullPath === '/system') {
        children = item.children.filter((child) => canAccessSystemChild(child.path, userStore.context))
      }
      const nested = filterMenuTree(children, fullPath)
      if (!nested.length && item.children.length) return null
      return { ...item, path: fullPath, children: nested }
    })
    .filter((x): x is MenuRoute => x !== null)
}

const visibleMenus = computed(() => filterMenuTree(menus))
</script>

<template>
  <el-container class="layout">
    <el-aside
      :width="appStore.sidebarCollapsed ? 'var(--pwms-sidebar-collapsed)' : 'var(--pwms-sidebar-width)'"
      class="sidebar"
    >
      <div class="logo">
        <el-icon :size="22" class="logo-icon"><Box /></el-icon>
        <span v-show="!appStore.sidebarCollapsed" class="logo-title">智慧化生产专业仓</span>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="appStore.sidebarCollapsed"
          :background-color="'transparent'"
          :text-color="'var(--pwms-sidebar-text)'"
          :active-text-color="'var(--pwms-sidebar-text-active)'"
          router
          :collapse-transition="false"
        >
          <template v-for="item in visibleMenus" :key="item.path">
            <el-sub-menu v-if="item.children?.length" :index="item.path">
              <template #title>
                <el-icon v-if="item.meta?.icon"><component :is="item.meta.icon" /></el-icon>
                <span>{{ item.meta?.title }}</span>
              </template>
              <template v-for="child in item.children" :key="child.path">
                <el-sub-menu v-if="child.children?.length" :index="child.path">
                  <template #title>{{ child.meta?.title }}</template>
                  <el-menu-item
                    v-for="grand in child.children"
                    :key="grand.path"
                    :index="grand.path"
                  >
                    {{ grand.meta?.title }}
                  </el-menu-item>
                </el-sub-menu>
                <el-menu-item v-else :index="child.path">
                  {{ child.meta?.title }}
                </el-menu-item>
              </template>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path">
              <el-icon v-if="item.meta?.icon"><component :is="item.meta.icon" /></el-icon>
              <template #title>{{ item.meta?.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="main-wrap">
      <el-header class="header">
        <div class="header-left">
          <button type="button" class="icon-btn" @click="appStore.toggleSidebar()">
            <el-icon :size="18"><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
          </button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx">{{ item }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="28" class="user-avatar">{{ userStore.displayName.slice(0, 1) }}</el-avatar>
              <span class="user-meta">
                <span class="user-name">{{ userStore.displayName }}</span>
                <span v-if="userStore.orgLabel" class="user-org">{{ userStore.orgLabel }}</span>
              </span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main v-loading="appStore.globalLoading" class="main">
        <router-view />
      </el-main>
      <el-footer class="footer" height="auto">
        Copyright © 2026-present 智慧化生产专业仓管理系统 · 专业仓数字化管控
      </el-footer>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.layout {
  height: 100vh;
  background: var(--pwms-page-bg);
}

.sidebar {
  background: var(--pwms-sidebar-bg);
  transition: width var(--pwms-transition);
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;

  .logo {
    height: var(--pwms-logo-height);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    color: var(--pwms-sidebar-text-active);
    font-size: 15px;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    white-space: nowrap;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--pwms-sidebar-bg-light);
  }

  .logo-icon {
    color: var(--pwms-primary);
    flex-shrink: 0;
  }

  .logo-title {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-scroll {
    flex: 1;
    min-height: 0;
  }

  :deep(.el-menu) {
    border-right: none;
    background: transparent;
  }

  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    &:hover {
      background: rgba(255, 255, 255, 0.06) !important;
    }
  }

  :deep(.el-menu-item.is-active) {
    background: var(--pwms-sidebar-active) !important;
    color: var(--pwms-sidebar-text-active) !important;
  }

  :deep(.el-sub-menu .el-menu) {
    background: var(--pwms-sidebar-bg-light) !important;
  }
}

.main-wrap {
  min-width: 0;
  background: var(--pwms-page-bg);
}

.header {
  height: var(--pwms-header-height);
  background: var(--pwms-header-bg);
  border-bottom: 1px solid var(--pwms-header-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: var(--pwms-header-text);

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--pwms-header-text);
    cursor: pointer;
    transition: background var(--pwms-transition);

    &:hover {
      background: var(--pwms-header-hover);
    }
  }

  :deep(.el-breadcrumb__inner),
  :deep(.el-breadcrumb__separator) {
    color: var(--pwms-text-secondary) !important;
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    color: var(--pwms-text) !important;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background var(--pwms-transition);

    &:hover {
      background: var(--pwms-header-hover);
    }
  }

  .user-avatar {
    background: var(--pwms-primary-soft);
    color: var(--pwms-primary);
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }

  .user-name {
    font-size: 14px;
    color: var(--pwms-text);
  }

  .user-org {
    font-size: 11px;
    color: var(--pwms-text-secondary);
  }
}

.main {
  padding: 0;
  background: var(--pwms-page-bg);
}

.footer {
  padding: 12px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--pwms-text-tertiary);
  background: var(--pwms-page-bg);
  border-top: 1px solid var(--pwms-border);
}
</style>
