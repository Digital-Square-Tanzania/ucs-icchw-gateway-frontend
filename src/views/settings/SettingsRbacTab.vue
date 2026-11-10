<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
      <h3 class="text-base font-semibold mb-2">Roles</h3>
      <div class="max-h-56 overflow-y-auto space-y-1 text-sm">
        <button
          v-for="r in roles"
          :key="r.id"
          type="button"
          class="w-full text-left rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-ucs-950"
          :class="selectedRole?.id === r.id ? 'bg-ucs-50 dark:bg-ucs-900 ring-1 ring-ucs-400' : ''"
          @click="selectRole(r)">
          {{ r.name }}
        </button>
      </div>
    </article>

    <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4 lg:col-span-2">
      <h3 class="text-base font-semibold mb-2">Permissions for {{ selectedRole?.name ?? '—' }}</h3>
      <p class="text-xs text-gray-500 mb-3">UCS Developer should keep <code>settings:manage</code> until other roles are configured.</p>
      <div class="max-h-72 overflow-y-auto grid sm:grid-cols-2 gap-1 text-xs font-mono">
        <label v-for="p in permissions" :key="p.id" class="flex items-center gap-2 py-1">
          <input v-model="selectedPermIds" type="checkbox" :value="p.id" />
          <span>{{ p.code }}</span>
        </label>
      </div>
      <button
        type="button"
        class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm text-white disabled:opacity-50"
        :disabled="!selectedRole || saving"
        @click="savePermissions">
        {{ saving ? 'Saving…' : 'Save permissions' }}
      </button>
    </article>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

interface RoleRow {
  id: number
  name: string
}
interface PermissionRow {
  id: string
  code: string
}

const auth = useAuthStore()
const toast = useToast()
const roles = ref<RoleRow[]>([])
const permissions = ref<PermissionRow[]>([])
const selectedRole = ref<RoleRow | null>(null)
const selectedPermIds = ref<string[]>([])
const saving = ref(false)

async function load() {
  const [rolesRes, permsRes] = await Promise.all([
    auth.apiClient.get<{ data?: RoleRow[] }>('/rbac/roles'),
    auth.apiClient.get<{ data?: PermissionRow[] }>('/rbac/permissions'),
  ])
  roles.value = rolesRes.data?.data ?? []
  permissions.value = permsRes.data?.data ?? []
}

async function selectRole(role: RoleRow) {
  selectedRole.value = role
  const res = await auth.apiClient.get<{ data?: { rolePermissions?: Array<{ permission: PermissionRow }> } }>(
    `/rbac/roles/${role.id}`,
  )
  const r = res.data?.data
  selectedPermIds.value = (r?.rolePermissions ?? []).map((rp) => rp.permission.id)
}

async function savePermissions() {
  if (!selectedRole.value) return
  saving.value = true
  try {
    await auth.apiClient.put(`/rbac/roles/${selectedRole.value.id}/permissions`, {
      permissionIds: selectedPermIds.value,
    })
    toast.add({ severity: 'success', summary: 'Permissions saved', life: 2500 })
    await auth.fetchProfile()
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 })
  } finally {
    saving.value = false
  }
}

onMounted(() => void load())
</script>
