<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { menuRoutes } from '@/router/menu'
import { useDataStore } from '@/stores/data'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const dataStore = useDataStore()

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

async function handleResetData() {
  await ElMessageBox.confirm('将恢复全部业务数据为初始状态，是否继续？', '恢复初始数据', { type: 'warning' })
  dataStore.resetAllData()
  ElMessage.success('数据已恢复')
}

function resolvePath(base: string, childPath: string) {
  if (childPath.startsWith('/')) return childPath
  return `${base}/${childPath}`.replace(/\/+/g, '/')
}
</script>

<template>
  <el-container class="layout">
    <el-aside :width="appStore.sidebarCollapsed ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <el-icon :size="24"><Box /></el-icon>
        <span v-show="!appStore.sidebarCollapsed">生产仓管理系统</span>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="appStore.sidebarCollapsed"
          background-color="#001529"
          text-color="rgba(255,255,255,0.75)"
          active-text-color="#fff"
          router
          :collapse-transition="false"
        >
          <template v-for="item in menus" :key="item.path">
            <el-sub-menu v-if="item.children?.length" :index="item.path">
              <template #title>
                <el-icon v-if="item.meta?.icon"><component :is="item.meta.icon" /></el-icon>
                <span>{{ item.meta?.title }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="resolvePath(item.path, child.path)"
                :index="resolvePath(item.path, child.path)"
              >
                {{ child.meta?.title }}
              </el-menu-item>
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
          <el-button text @click="appStore.toggleSidebar()">
            <el-icon :size="18"><Fold v-if="!appStore.sidebarCollapsed" /><Expand v-else /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="(item, idx) in breadcrumbs" :key="idx">{{ item }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="28">{{ userStore.displayName.slice(0, 1) }}</el-avatar>
              <span>{{ userStore.displayName }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleResetData">恢复初始数据</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main v-loading="appStore.globalLoading" class="main">
        <router-view />
      </el-main>
      <el-footer class="footer" height="auto">
        Copyright © 2026-present 生产仓管理系统
      </el-footer>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.layout {
  height: 100vh;
}

.sidebar {
  background: var(--pwms-sidebar-bg);
  transition: width 0.2s;
  overflow: hidden;

  .logo {
    height: var(--pwms-header-height);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    white-space: nowrap;
    overflow: hidden;
  }

  :deep(.el-menu) {
    border-right: none;
  }

  :deep(.el-menu-item.is-active) {
    background: var(--pwms-sidebar-active) !important;
  }
}

.main-wrap {
  min-width: 0;
}

.header {
  height: var(--pwms-header-height);
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }
}

.main {
  padding: 0;
  background: #f0f2f5;
}

.footer {
  padding: 12px 16px;
  text-align: center;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  background: #f0f2f5;
  border-top: 1px solid #f0f0f0;
}
</style>
