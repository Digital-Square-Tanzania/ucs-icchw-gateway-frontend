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
          v-model="managerForm.roleId"
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
          Choose <strong>COUNCIL_COORDINATOR</strong> to assign Region → District → Council.
        </Message>
      </div>

      <template v-if="showCouncilAssignment">
        <div class="md:col-span-2 rounded-lg border border-ucs-200 dark:border-ucs-700 bg-ucs-50/50 dark:bg-ucs-900/30 p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-3">
            Council assignment
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label for="mgr-region" class="text-sm">Region</label>
              <Select
                id="mgr-region"
                v-model="managerForm.assignedRegion"
                :options="regions"
                placeholder="Select region"
                class="w-full"
                size="large"
                :disabled="hierarchyLoading"
                @update:model-value="onRegionChange" />
            </div>
            <div>
              <label for="mgr-district" class="text-sm">District</label>
              <Select
                id="mgr-district"
                v-model="managerForm.assignedDistrict"
                :options="districts"
                placeholder="Select district"
                class="w-full"
                size="large"
                :disabled="!managerForm.assignedRegion || hierarchyLoading"
                @update:model-value="onDistrictChange" />
            </div>
            <div>
              <label for="mgr-council" class="text-sm">Council</label>
              <Select
                id="mgr-council"
                v-model="managerForm.assignedCouncil"
                :options="councils"
                placeholder="Select council"
                class="w-full"
                size="large"
                :disabled="!managerForm.assignedDistrict || hierarchyLoading" />
            </div>
          </div>
          <p v-if="hierarchyError" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ hierarchyError }}</p>
          <p v-else-if="hierarchyLoading" class="mt-2 text-xs text-gray-500">Loading location hierarchy…</p>
        </div>
      </template>

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
import { computed, onMounted, ref, watch } from "vue";
import { InputText, Select, Button, Message, Password } from "primevue";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue/usetoast";
import { useRouter } from "vue-router";

type Council = { name: string }
type District = { name: string; councils?: Record<string, Council> }
type Region = { name: string; districts?: Record<string, District> }
type Hierarchy = Record<string, { zones?: Record<string, { regions?: Record<string, Region> }> }>

const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();
const router = useRouter();

const managerRoles = ref<Array<{ label: string; value: number; roleName: string }>>([]);
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

function roleForId(roleId: number | string | null | undefined) {
  if (roleId == null || roleId === "") return undefined;
  const id = Number(roleId);
  if (!Number.isFinite(id)) return undefined;
  return managerRoles.value.find((r) => Number(r.value) === id);
}

function isCouncilCoordinatorRole(roleId: number | string | null | undefined) {
  const role = roleForId(roleId);
  if (!role) return false;
  return (
    role.roleName === "COUNCIL_COORDINATOR" ||
    role.label.startsWith("COUNCIL_COORDINATOR")
  );
}

const showCouncilAssignment = computed(() => isCouncilCoordinatorRole(managerForm.value.roleId));

function onRoleIdChange(value: number | string | null) {
  if (value == null || value === "") {
    managerForm.value.roleId = null;
  } else {
    const n = Number(value);
    managerForm.value.roleId = Number.isFinite(n) ? n : null;
  }
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

async function loadHierarchy() {
  if (hierarchyLoading.value || regions.value.length > 0) return;
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
  void loadHierarchy();
}

watch(
  () => managerForm.value.roleId,
  () => onRoleChange(),
);

async function loadManagerRoles() {
  rolesLoading.value = true;
  rolesError.value = null;
  try {
    const rolesResponse = await apiClient.get<{
      status?: string;
      data?: Array<{ id: number; name: string; description?: string }>;
    }>("/user/roles");
    const roleList =
      rolesResponse.data?.data ??
      (Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
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
      roleId: Number(managerForm.value.roleId),
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
