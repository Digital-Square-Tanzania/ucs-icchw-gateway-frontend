<template>
  <PageTitle heading="Add manager user" subtext="Create a UCS User Manager account (Postgres roles)" />

  <div id="table-bg" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <form @submit.prevent="submitManagerForm" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label for="mgr-firstName">First Name</label>
        <InputText id="mgr-firstName" v-model="managerForm.firstName" class="w-full" required size="large" />
      </div>
      <div>
        <label for="mgr-middleName">Middle Name</label>
        <InputText id="mgr-middleName" v-model="managerForm.middleName" class="w-full" size="large" />
      </div>
      <div>
        <label for="mgr-lastName">Last Name</label>
        <InputText id="mgr-lastName" v-model="managerForm.lastName" class="w-full" required size="large" />
      </div>
      <div>
        <label for="mgr-email">Email</label>
        <InputText id="mgr-email" v-model="managerForm.email" class="w-full" type="email" required size="large" />
      </div>
      <div>
        <label for="mgr-phone">Phone (optional)</label>
        <InputText id="mgr-phone" v-model="managerForm.phoneNumber" class="w-full" size="large" />
      </div>
      <div>
        <label for="mgr-role">Manager role</label>
        <Select
          id="mgr-role"
          :model-value="managerForm.roleId"
          :options="managerRoles"
          optionLabel="label"
          optionValue="value"
          placeholder="Select role"
          class="w-full"
          size="large"
          :loading="rolesLoading"
          required
          @update:model-value="onRoleIdChange" />
        <Message v-if="rolesError" severity="error" size="small" class="mt-1">{{ rolesError }}</Message>
        <Message
          v-else-if="!showCouncilAssignment"
          size="small"
          severity="secondary"
          variant="simple"
          class="mt-1">
          Choose <strong>COUNCIL_COORDINATOR</strong> to assign Region → District → Council below.
        </Message>
      </div>

      <div
        v-show="showCouncilAssignment"
        class="md:col-span-2 rounded-lg border border-ucs-200 dark:border-ucs-700 bg-ucs-50/50 dark:bg-ucs-900/30 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-3">
          Council assignment
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="mgr-region" class="text-sm block mb-1">Region</label>
            <select
              id="mgr-region"
              v-model="managerForm.assignedRegion"
              class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-2.5 text-base"
              :disabled="hierarchyLoading || !regions.length"
              @change="onRegionChange">
              <option value="">Select region</option>
              <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div>
            <label for="mgr-district" class="text-sm block mb-1">District</label>
            <select
              id="mgr-district"
              v-model="managerForm.assignedDistrict"
              class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-2.5 text-base disabled:opacity-60"
              :disabled="!managerForm.assignedRegion || hierarchyLoading"
              @change="onDistrictChange">
              <option value="">Select district</option>
              <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label for="mgr-council" class="text-sm block mb-1">Council</label>
            <select
              id="mgr-council"
              v-model="managerForm.assignedCouncil"
              class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-2.5 text-base disabled:opacity-60"
              :disabled="!managerForm.assignedDistrict || hierarchyLoading">
              <option value="">Select council</option>
              <option v-for="c in councils" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <p v-if="hierarchyError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ hierarchyError }}</p>
        <p v-else-if="hierarchyLoading" class="mt-2 text-xs text-gray-500">Loading location hierarchy…</p>
        <p
          v-else-if="!regions.length"
          class="mt-2 text-sm text-amber-700 dark:text-amber-300">
          No regions loaded. In Settings, run Sync Locations (full), then Refresh Location Hierarchy View.
        </p>
      </div>

      <div>
        <label for="mgr-password">Password</label>
        <Password
          id="mgr-password"
          v-model="managerForm.password"
          class="w-full"
          inputClass="w-full"
          toggleMask
          :feedback="true"
          required
          @blur="passwordTouched = true" />
      </div>
      <div>
        <label for="mgr-password-confirm">Confirm password</label>
        <Password
          id="mgr-password-confirm"
          v-model="managerForm.confirmPassword"
          class="w-full"
          inputClass="w-full"
          toggleMask
          :feedback="false"
          required
          :invalid="passwordsMismatch"
          @blur="confirmPasswordTouched = true" />
        <Message v-if="passwordsMismatch" severity="error" size="small" class="mt-1">
          Passwords do not match.
        </Message>
      </div>
      <div class="md:col-span-2">
        <Message size="small" severity="secondary" variant="simple">
          Uppercase, lowercase, number, and special character required.
        </Message>
      </div>
      <div class="md:col-span-2 flex justify-end gap-2">
        <Button
          type="button"
          label="Cancel"
          severity="secondary"
          outlined
          @click="router.push({ name: 'Users', query: { system: 'manager' } })" />
        <Button label="Create manager user" type="submit" icon="pi pi-check" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import PageTitle from "@/components/layout/PageTitle.vue";
import { computed, onMounted, ref } from "vue";
import { InputText, Select, Button, Message, Password } from "primevue";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue/usetoast";
import { useRouter } from "vue-router";

type Council = { name: string }
type District = { name: string; councils?: Record<string, Council> }
type Region = { name: string; districts?: Record<string, District> }
type Hierarchy = Record<string, { zones?: Record<string, { regions?: Record<string, Region> }> }>
type ManagerRoleOption = { label: string; value: number; roleName: string }

function unwrapApiList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[]
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

function normalizeRoleId(roleId: unknown): number | null {
  if (roleId == null || roleId === '') return null
  if (typeof roleId === 'object' && roleId !== null) {
    if ('value' in roleId) {
      const n = Number((roleId as ManagerRoleOption).value)
      return Number.isFinite(n) ? n : null
    }
    if ('id' in roleId) {
      const n = Number((roleId as { id: unknown }).id)
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  const n = Number(roleId)
  return Number.isFinite(n) ? n : null
}

function roleNameLooksLikeCouncilCoordinator(name: string | undefined, label?: string): boolean {
  const n = (name || '').toUpperCase()
  if (n === 'COUNCIL_COORDINATOR' || n.includes('COUNCIL_COORDINATOR')) return true
  const l = (label || '').toUpperCase()
  return l.includes('COUNCIL_COORDINATOR')
}

const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();
const router = useRouter();

const managerRoles = ref<ManagerRoleOption[]>([]);
const rolesLoading = ref(false);
const rolesError = ref<string | null>(null);

const hierarchy = ref<Hierarchy>({});
const regions = ref<string[]>([]);
const districts = ref<string[]>([]);
const councils = ref<string[]>([]);
const hierarchyLoading = ref(false);
const hierarchyError = ref("");
const passwordTouched = ref(false);
const confirmPasswordTouched = ref(false);

const managerForm = ref({
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  roleId: null as number | string | null,
  assignedRegion: "",
  assignedDistrict: "",
  assignedCouncil: "",
});

const passwordsMismatch = computed(() => {
  if (!passwordTouched.value && !confirmPasswordTouched.value) return false;
  if (!managerForm.value.confirmPassword) return false;
  return managerForm.value.password !== managerForm.value.confirmPassword;
});

function roleForId(roleId: unknown) {
  const id = normalizeRoleId(roleId);
  if (id == null) return undefined;
  return managerRoles.value.find((r) => Number(r.value) === id);
}

function isCouncilCoordinatorRole(roleId: unknown) {
  if (typeof roleId === 'object' && roleId !== null && 'roleName' in roleId) {
    const opt = roleId as ManagerRoleOption;
    return roleNameLooksLikeCouncilCoordinator(opt.roleName, opt.label);
  }
  const role = roleForId(roleId);
  if (role) return roleNameLooksLikeCouncilCoordinator(role.roleName, role.label);
  const id = normalizeRoleId(roleId);
  // Default seed order: COUNCIL_COORDINATOR is id 3
  return id === 3;
}

const showCouncilAssignment = computed(() => isCouncilCoordinatorRole(managerForm.value.roleId));

function onRoleIdChange(value: unknown) {
  managerForm.value.roleId = normalizeRoleId(value);
  onRoleChange();
}

function eachRegion(fn: (region: Region) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) {
        fn(region);
      }
    }
  }
}

async function loadHierarchy(force = false) {
  if (hierarchyLoading.value) return;
  if (!force && regions.value.length > 0) return;
  hierarchyLoading.value = true;
  hierarchyError.value = "";
  try {
    const response = await apiClient.get<{ status?: string; data?: Hierarchy }>(
      "/openmrs/location/hierarchy/grouped",
    );
    const payload = response.data as { data?: Hierarchy };
    hierarchy.value = payload?.data ?? (response.data as unknown as Hierarchy) ?? {};
    const set = new Set<string>();
    eachRegion((region) => {
      if (region.name) set.add(region.name);
    });
    regions.value = [...set].sort();
    if (!regions.value.length) {
      hierarchyError.value =
        "No regions in hierarchy. Sync locations and refresh the hierarchy view in Settings.";
    }
  } catch (error) {
    console.error("Failed to load hierarchy:", error);
    hierarchyError.value = "Could not load region / district / council list.";
  } finally {
    hierarchyLoading.value = false;
  }
}

function onRegionChange() {
  managerForm.value.assignedDistrict = "";
  managerForm.value.assignedCouncil = "";
  districts.value = [];
  councils.value = [];
  const set = new Set<string>();
  eachRegion((region) => {
    if (region.name !== managerForm.value.assignedRegion) return;
    for (const d of Object.values(region.districts ?? {})) {
      if (d.name) set.add(d.name);
    }
  });
  districts.value = [...set].sort();
}

function onDistrictChange() {
  managerForm.value.assignedCouncil = "";
  councils.value = [];
  const set = new Set<string>();
  eachRegion((region) => {
    if (region.name !== managerForm.value.assignedRegion) return;
    for (const d of Object.values(region.districts ?? {})) {
      if (d.name !== managerForm.value.assignedDistrict) continue;
      for (const c of Object.values(d.councils ?? {})) {
        if (c.name) set.add(c.name);
      }
    }
  });
  councils.value = [...set].sort();
}

function onRoleChange() {
  if (!showCouncilAssignment.value) {
    managerForm.value.assignedRegion = "";
    managerForm.value.assignedDistrict = "";
    managerForm.value.assignedCouncil = "";
    districts.value = [];
    councils.value = [];
    return;
  }
  void loadHierarchy(!regions.value.length && !!hierarchyError.value);
}

async function loadManagerRoles() {
  rolesLoading.value = true;
  rolesError.value = null;
  try {
    const rolesResponse = await apiClient.get<{
      status?: string;
      data?: Array<{ id: number; name: string; description?: string }>;
    }>("/user/roles");
    const roleList = unwrapApiList<{ id: number; name: string; description?: string }>(
      rolesResponse.data,
    );
    managerRoles.value = roleList.map((r) => ({
      label: r.description ? `${r.name} — ${r.description}` : r.name,
      value: r.id,
      roleName: r.name,
    }));
    if (!managerRoles.value.length) {
      rolesError.value = "No manager roles returned. Deploy latest backend (GET /user/roles).";
    }
  } catch (error) {
    console.error("Failed to load manager roles:", error);
    rolesError.value = "Could not load manager roles from the API.";
  } finally {
    rolesLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await apiClient.get("/auth/me");
    await Promise.all([loadManagerRoles(), loadHierarchy()]);
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      authStore.logout(router, toast);
      router.push({ name: "Login" });
    }
  }
});

const submitManagerForm = async () => {
  if (!managerForm.value.roleId) {
    toast.add({ severity: "warn", summary: "Role required", detail: "Select a role.", life: 3000 });
    return;
  }
  if (!managerRoles.value.length) {
    await loadManagerRoles();
  }
  const roleId = normalizeRoleId(managerForm.value.roleId);
  if (roleId != null) managerForm.value.roleId = roleId;
  const needsCouncil = isCouncilCoordinatorRole(managerForm.value.roleId);
  if (needsCouncil) {
    if (!managerForm.value.assignedRegion || !managerForm.value.assignedDistrict || !managerForm.value.assignedCouncil) {
      toast.add({
        severity: "warn",
        summary: "Council required",
        detail: "Select region, district, and council for a council coordinator.",
        life: 4000,
      });
      return;
    }
  }

  passwordTouched.value = true;
  confirmPasswordTouched.value = true;
  if (!managerForm.value.password || !managerForm.value.confirmPassword) {
    toast.add({
      severity: "warn",
      summary: "Password required",
      detail: "Enter and confirm the password.",
      life: 3000,
    });
    return;
  }
  if (managerForm.value.password !== managerForm.value.confirmPassword) {
    toast.add({
      severity: "error",
      summary: "Passwords do not match",
      detail: "Confirm password must match the password field.",
      life: 3000,
    });
    return;
  }

  authStore.loading = true;
  try {
    const payload: Record<string, unknown> = {
      firstName: managerForm.value.firstName,
      middleName: managerForm.value.middleName || undefined,
      lastName: managerForm.value.lastName,
      email: managerForm.value.email,
      phoneNumber: managerForm.value.phoneNumber || undefined,
      password: managerForm.value.password,
      roleId: roleId ?? Number(managerForm.value.roleId),
    };
    if (needsCouncil || managerForm.value.assignedCouncil) {
      payload.assignedRegion = managerForm.value.assignedRegion;
      payload.assignedDistrict = managerForm.value.assignedDistrict;
      payload.assignedCouncil = managerForm.value.assignedCouncil;
    }
    await apiClient.post("/user", payload);
    toast.add({
      severity: "success",
      summary: "User created",
      detail: "Manager user added successfully",
      life: 2000,
    });
    await router.push({ name: "Users", query: { system: "manager", page: "last" } });
  } catch (error: unknown) {
    const detail = typeof error === "string" ? error : "Could not create user";
    toast.add({ severity: "error", summary: "Failed to create user", detail, life: 4000 });
  } finally {
    authStore.loading = false;
  }
};
</script>
