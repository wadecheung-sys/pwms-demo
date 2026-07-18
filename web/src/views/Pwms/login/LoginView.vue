<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: '123456',
})

const highlights = [
  {
    icon: 'OfficeBuilding',
    title: '主数据统一',
    desc: '生产仓地点、备品备件、仪器仪表、工器具分类建档与关联维护',
  },
  {
    icon: 'Lock',
    title: '分级权限管控',
    desc: '按省、市、县、班组组织体系实现数据可见范围与操作权限隔离',
  },
  {
    icon: 'Refresh',
    title: '业务全程留痕',
    desc: '台账建档、出入库审批确认、故障维修、盘点过账与报废归档形成完整闭环',
  },
  {
    icon: 'Monitor',
    title: '智慧仓监测',
    desc: '温湿度、烟感等环境数据接入，支撑仓室运行状态感知',
  },
]

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  await new Promise((r) => setTimeout(r, 400))
  const ok = userStore.login(form.username, form.password)
  loading.value = false
  if (ok) {
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } else {
    ElMessage.error('账号或密码错误')
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-panel">
      <div class="brand">
        <div class="brand-mark">
          <el-icon :size="28"><Box /></el-icon>
        </div>
        <h1>智慧化生产专业仓管理系统</h1>
        <p>Smart Production Warehouse Management</p>
      </div>
      <el-form :model="form" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="请输入账号" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>
    </div>
    <div class="login-bg">
      <div class="bg-content">
        <p class="bg-eyebrow">POWER GRID · WAREHOUSE</p>
        <h2>数字化生产专业仓管理</h2>
        <p class="bg-lead">面向电力生产专业的仓室与物资一体化管理平台，支撑各级单位协同作业与精细管控。</p>
        <div class="feature-grid">
          <div v-for="item in highlights" :key="item.title" class="feature-card">
            <div class="feature-card__icon">
              <el-icon :size="20"><component :is="item.icon" /></el-icon>
            </div>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 460px 1fr;
  background: var(--pwms-login-bg);
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 48px;
  background: var(--pwms-login-panel);
  border-right: 1px solid var(--pwms-border);

  .brand {
    margin-bottom: 36px;

    .brand-mark {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--pwms-primary-soft);
      color: var(--pwms-primary);
      margin-bottom: 16px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 600;
      color: var(--pwms-text);
      line-height: 1.35;
    }

    p {
      margin: 0;
      color: var(--pwms-text-secondary);
      font-size: 13px;
    }
  }

  :deep(.el-form-item__label) {
    color: var(--pwms-text-secondary);
  }

  .login-btn {
    width: 100%;
    margin-top: 8px;
  }
}

.login-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 70% 40%, rgba(22, 119, 255, 0.22), transparent 55%),
    radial-gradient(ellipse 50% 40% at 20% 80%, rgba(64, 158, 255, 0.1), transparent 50%),
    linear-gradient(160deg, #0b1220 0%, #111827 45%, #0a0a0a 100%);
  color: var(--pwms-text);
  padding: 48px;

  .bg-content {
    max-width: 560px;
    position: relative;
    z-index: 1;
  }

  .bg-eyebrow {
    margin: 0 0 12px;
    font-size: 12px;
    letter-spacing: 0.12em;
    color: var(--pwms-text-secondary);
  }

  h2 {
    font-size: 30px;
    margin: 0 0 16px;
    line-height: 1.3;
    color: #fff;
    font-weight: 600;
  }

  .bg-lead {
    margin: 0 0 28px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--pwms-text-secondary);
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.feature-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &__icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--pwms-primary-soft);
    color: var(--pwms-primary);
  }

  h3 {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--pwms-text);
  }

  p {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: var(--pwms-text-secondary);
  }
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-bg {
    display: none;
  }
}
</style>
