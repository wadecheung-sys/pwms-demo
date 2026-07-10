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
        <el-icon :size="40" color="#1677ff"><Box /></el-icon>
        <h1>生产仓管理系统</h1>
        <p>Production Warehouse Management System</p>
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
        <h2>数字化生产仓管理</h2>
        <ul>
          <li>生产仓 · 备品备件 · 仪器仪表 · 工器具统一管理</li>
          <li>台账录入、出入库、故障与维修全流程跟踪</li>
          <li>按组织机构逐级下发盘点任务，自动统计完成情况</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 480px 1fr;
  background: #f0f2f5;
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px;
  background: #fff;
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.04);

  .brand {
    margin-bottom: 36px;

    h1 {
      margin: 12px 0 4px;
      font-size: 26px;
    }

    p {
      margin: 0;
      color: #8c8c8c;
      font-size: 13px;
    }
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
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 50%, #001529 100%);
  color: #fff;
  padding: 40px;

  .bg-content {
    max-width: 520px;

    h2 {
      font-size: 32px;
      margin: 0 0 24px;
    }

    ul {
      padding-left: 20px;
      line-height: 2;
      opacity: 0.92;
    }
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
