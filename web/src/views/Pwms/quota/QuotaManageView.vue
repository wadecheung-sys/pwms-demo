<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { usePagination } from '@/composables/usePagination'
import type { QuotaFormulaType } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const dataStore = useDataStore()
const action = computed(() => (route.meta.quotaAction || 'rules') as 'rules' | 'params' | 'results' | 'catalog')

const ruleDialog = ref(false)
const paramDialog = ref(false)
const ruleForm = reactive({
  id: '',
  name: '',
  category: 'spare' as const,
  typeName: '轴承',
  formulaType: 'production' as QuotaFormulaType,
  k: 5,
  a: 0.8,
  t: 3,
  p: 20,
  unit: '个',
  remark: '',
})

const paramForm = reactive({
  id: '',
  orgId: '',
  warehouseId: '',
  ruleId: '',
  deviceCount: 100,
})

function openRule(edit?: boolean, id?: string) {
  if (edit && id) {
    const r = dataStore.quotaRules.find((x) => x.id === id)
    if (r) Object.assign(ruleForm, r)
  } else {
    Object.assign(ruleForm, {
      id: '',
      name: '',
      category: 'spare',
      typeName: '轴承',
      formulaType: 'production',
      k: 5,
      a: 0.8,
      t: 3,
      p: 20,
      unit: '个',
      remark: '',
    })
  }
  ruleDialog.value = true
}

function saveRule() {
  dataStore.saveQuotaRule({
    id: ruleForm.id || undefined,
    name: ruleForm.name,
    category: ruleForm.category,
    typeName: ruleForm.typeName,
    formulaType: ruleForm.formulaType,
    k: ruleForm.k,
    a: ruleForm.a,
    t: ruleForm.t,
    p: ruleForm.p,
    unit: ruleForm.unit,
    remark: ruleForm.remark,
  })
  ElMessage.success('规则已保存')
  ruleDialog.value = false
}

function openParam(edit?: boolean, id?: string) {
  if (edit && id) {
    const p = dataStore.orgDeviceParams.find((x) => x.id === id)
    if (p) {
      Object.assign(paramForm, {
        id: p.id,
        orgId: p.orgId,
        warehouseId: p.warehouseId || '',
        ruleId: p.ruleId,
        deviceCount: p.deviceCount,
      })
    }
  } else {
    Object.assign(paramForm, {
      id: '',
      orgId: dataStore.organizations[0]?.id ?? '',
      warehouseId: '',
      ruleId: dataStore.quotaRules[0]?.id ?? '',
      deviceCount: 100,
    })
  }
  paramDialog.value = true
}

function saveParam() {
  dataStore.saveOrgDeviceParam({ ...paramForm, id: paramForm.id || undefined })
  ElMessage.success('参数已保存')
  paramDialog.value = false
}

async function removeRule(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该定额规则？关联参数需重新绑定。', '删除确认', { type: 'warning' })
    dataStore.removeQuotaRule(id)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

async function removeParam(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该单位参数？', '删除确认', { type: 'warning' })
    dataStore.removeOrgDeviceParam(id)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

function calc() {
  const res = dataStore.calculateAllQuotas()
  ElMessage.success(`已测算 ${res.length} 条，缺额将写入告警中心`)
}

const titles = {
  rules: '定额规则',
  params: '单位参数填报',
  results: '定额测算结果',
  catalog: '一仓一策目录',
}

const listSource = computed(() => {
  if (action.value === 'rules') return dataStore.quotaRules
  if (action.value === 'params') return dataStore.orgDeviceParams
  return dataStore.quotaResults
})
const { currentPage, pageSize, total, pageData } = usePagination(listSource, 10)
</script>

<template>
  <PageShell
    tip="双公式：生产仓 N=A×(1−K)×a ；配置原则 N=A·K·a·T/P。低于下限告警补仓，高于上限提示消纳。"
  >
    <PageHeader :title="titles[action]">
      <template #actions>
        <el-button v-if="action === 'rules'" type="primary" @click="openRule(false)">新增规则</el-button>
        <el-button v-if="action === 'params'" type="primary" @click="openParam(false)">填报参数</el-button>
        <el-button v-if="action === 'results' || action === 'catalog'" type="primary" @click="calc">重新测算</el-button>
      </template>
    </PageHeader>

      <el-table v-if="action === 'rules'" :data="pageData" border stripe>
        <el-table-column prop="name" label="规则名称" min-width="160" />
        <el-table-column prop="typeName" label="品类" width="100" />
        <el-table-column prop="formulaType" label="公式" width="110">
          <template #default="{ row }">
            {{ row.formulaType === 'production' ? '生产仓' : '配置原则' }}
          </template>
        </el-table-column>
        <el-table-column prop="k" label="K" width="70" />
        <el-table-column prop="a" label="a" width="70" />
        <el-table-column prop="t" label="T(月)" width="80" />
        <el-table-column prop="p" label="P(年)" width="80" />
        <el-table-column prop="remark" label="说明" min-width="140" />
        <el-table-column label="操作" width="168">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" plain @click="openRule(true, row.id)">编辑</el-button>
              <el-button type="danger" size="small" plain @click="removeRule(row.id)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无定额规则" /></template>
      </el-table>

      <el-table v-else-if="action === 'params'" :data="pageData" border stripe>
        <el-table-column prop="orgName" label="单位" min-width="120" />
        <el-table-column prop="warehouseName" label="仓室" min-width="140" />
        <el-table-column label="规则" min-width="140">
          <template #default="{ row }">
            {{ dataStore.quotaRules.find((r) => r.id === row.ruleId)?.name || row.ruleId }}
          </template>
        </el-table-column>
        <el-table-column prop="deviceCount" label="设备量 A" width="100" />
        <el-table-column prop="updatedAt" label="更新时间" width="170" />
        <el-table-column label="操作" width="168">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" plain @click="openParam(true, row.id)">编辑</el-button>
              <el-button type="danger" size="small" plain @click="removeParam(row.id)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无定额参数" /></template>
      </el-table>

      <el-table v-else :data="pageData" border stripe>
        <el-table-column prop="orgName" label="单位" min-width="120" />
        <el-table-column prop="warehouseName" label="仓室" min-width="140" />
        <el-table-column prop="typeName" label="品类" width="100" />
        <el-table-column prop="formulaType" label="公式" width="100">
          <template #default="{ row }">
            {{ row.formulaType === 'production' ? '生产仓' : '配置原则' }}
          </template>
        </el-table-column>
        <el-table-column prop="deviceCount" label="A" width="70" />
        <el-table-column prop="standardQty" label="标准定额" width="100" />
        <el-table-column prop="lowerLimit" label="下限" width="80" />
        <el-table-column prop="upperLimit" label="上限" width="80" />
        <el-table-column prop="actualQty" label="实库存" width="90" />
        <el-table-column prop="shortage" label="缺额" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.shortage > 0" type="danger">{{ row.shortage }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="overage" label="超额" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.overage > 0" type="warning">{{ row.overage }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="calculatedAt" label="测算时间" width="170" />
        <template #empty><el-empty description="暂无测算结果" /></template>
      </el-table>
      <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog v-model="ruleDialog" title="定额规则" width="560px">
      <p class="dialog-hint">生产仓公式侧重保有系数；配置原则公式侧重周期与覆盖率参数。</p>
      <el-form label-width="110px">
        <el-form-item label="名称"><el-input v-model="ruleForm.name" /></el-form-item>
        <el-form-item label="品类名称"><el-input v-model="ruleForm.typeName" /></el-form-item>
        <el-form-item label="公式类型">
          <el-radio-group v-model="ruleForm.formulaType">
            <el-radio value="production">生产仓 N=A×(1-K)×a</el-radio>
            <el-radio value="standard">配置原则 N=A·K·a·T/P</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="K"><el-input-number v-model="ruleForm.k" :min="0" :step="0.1" /></el-form-item>
        <el-form-item label="a"><el-input-number v-model="ruleForm.a" :min="0" :step="0.1" /></el-form-item>
        <el-form-item v-if="ruleForm.formulaType === 'standard'" label="T(月)"><el-input-number v-model="ruleForm.t" :min="1" /></el-form-item>
        <el-form-item v-if="ruleForm.formulaType === 'standard'" label="P(年)"><el-input-number v-model="ruleForm.p" :min="1" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="ruleForm.unit" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="paramDialog" title="单位参数" width="520px">
      <el-form label-width="100px">
        <el-form-item label="单位">
          <el-select v-model="paramForm.orgId" filterable style="width: 100%">
            <el-option v-for="o in dataStore.organizations" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓室">
          <el-select v-model="paramForm.warehouseId" clearable filterable style="width: 100%">
            <el-option v-for="w in dataStore.warehouseSites" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="规则">
          <el-select v-model="paramForm.ruleId" style="width: 100%">
            <el-option v-for="r in dataStore.quotaRules" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备量 A"><el-input-number v-model="paramForm.deviceCount" :min="1" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paramDialog = false">取消</el-button>
        <el-button type="primary" @click="saveParam">保存</el-button>
      </template>
    </el-dialog>
</template>
