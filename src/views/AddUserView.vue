<template>
  <PageTitle :heading="pageHeading" :subtext="pageSubtext" />

  <div
    v-if="isDhis2"
    class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
  DHIS2 users are not added manually. Use Settings → sync to refresh users from DHIS2.
    <button
      type="button"
      class="ml-2 font-medium text-ucs-600 underline"
      @click="router.push({ name: 'Users', query: { system: 'dhis2' } })">
      Back to DHIS2 users
    </button>
  </div>

  <template v-else-if="isManager">
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
          <label for="mgr-role">Role</label>
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
            required />
        </div>
        <div class="md:col-span-2">
          <label for="mgr-password">Password</label>
          <Password
            id="mgr-password"
            v-model="managerForm.password"
            class="w-full"
            inputClass="w-full"
            toggleMask
            :feedback="true"
            required />
          <Message size="small" severity="secondary" variant="simple" class="mt-1">
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

  <template v-else>
    <div class="flex flex-col items-stretch mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        Team role (OpenMRS)
      </p>
      <SelectButton
        id="teamRole"
        v-model="form.selectedRole"
        :options="teamRoles.map((role) => ({ label: role.name, value: role.uuid }))"
        optionLabel="label"
        optionValue="value" />
    </div>

    <div id="table-bg" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <form @submit.prevent="submitOpenMrsForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 gap-y-20">
        <div>
          <label for="firstName">First Name</label>
          <InputText id="firstName" v-model="form.firstName" class="w-full" required size="large" />
        </div>

        <div>
          <label for="middleName">Middle Name</label>
          <InputText id="middleName" v-model="form.middleName" class="w-full" size="large" />
        </div>

        <div>
          <label for="lastName">Last Name</label>
          <InputText id="lastName" v-model="form.lastName" class="w-full" required size="large" />
        </div>

        <div v-if="form.selectedRole === icchwRoleUuid">
          <label for="nin">NIN</label>
          <InputMask
            id="nin"
            v-model="form.NIN"
            class="w-full"
            required
            mask="99999999-99999-99999-99"
            placeholder="e.g. 19981027-12345-00001-12"
            size="large" />
          <Message size="small" severity="secondary" variant="simple">Do not add dashes.</Message>
        </div>

        <div>
          <label for="sex">Sex</label>
          <Select
            id="sex"
            v-model="form.sex"
            :options="sexOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select"
            class="w-full"
            size="large" />
        </div>

        <div>
          <label for="email">Email</label>
          <InputText id="email" v-model="form.email" class="w-full" type="email" required size="large" />
        </div>

        <div>
          <label for="phone">Phone Number</label>
          <InputMask
            id="phone"
            v-model="form.rawPhoneNumber"
            class="w-full"
            mask="(0999) 999999"
            placeholder="(0755) 437887"
            size="large"
            @blur="handlePhoneBlur" />
          <Message v-if="phoneTaken" severity="error" size="small" class="mt-1">
            This phone number is already in use.
          </Message>
          <Message v-else size="small" severity="secondary" variant="simple">
            Do not add the leading 0. This will be the CHW username
          </Message>
        </div>

        <div>
          <label for="hfr">Facility (Search by name)</label>
          <AutoComplete
            v-model="selectedFacility"
            :suggestions="facilitySuggestions"
            @complete="searchFacilities"
            placeholder="Search facility by name"
            class="w-full"
            optionLabel="name"
            forceSelection
            inputClass="w-full"
            size="large">
            <!-- @vue-ignore -->
            <template #item="{ item }">
              {{ item.name }}
            </template>
          </AutoComplete>
        </div>

        <div>
          <label for="location">Location Code</label>
          <Select
            v-model="form.locationCode"
            :options="locationOptions"
            optionLabel="name"
            optionValue="locationCode"
            placeholder="Select location"
            class="w-full"
            size="large"
            :disabled="locationOptions.length === 0" />
        </div>

        <div class="md:col-span-2 lg:col-span-3 text-right">
          <Button label="Add OpenMRS user" type="submit" class="mt-4" icon="pi pi-user-plus" />
        </div>
      </form>
    </div>
  </template>
</template>

<script setup lang="ts">
import PageTitle from "@/components/layout/PageTitle.vue";
import { computed, onMounted, ref, watch } from "vue";
import { InputText, Select, Button, InputMask, Message, SelectButton, Password } from "primevue";
import AutoComplete from "primevue/autocomplete";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue/usetoast";
import { useRoute, useRouter } from "vue-router";

interface Facility {
  name: string;
  hfrCode: string;
  parent: string;
}

const props = defineProps({
  system: {
    type: String,
    default: "openmrs",
  },
});

const route = useRoute();
const normalizedSystem = computed(() => {
  const fromRoute = route.params.system;
  const raw = typeof fromRoute === "string" ? fromRoute : Array.isArray(fromRoute) ? fromRoute[0] : "";
  return (raw || props.system || "openmrs").toLowerCase();
});
const isManager = computed(() => normalizedSystem.value === "manager");
const isDhis2 = computed(() => normalizedSystem.value === "dhis2");
const isOpenMrs = computed(() => !isManager.value && !isDhis2.value);

const pageHeading = computed(() =>
  isManager.value ? "Add manager user" : isDhis2.value ? "DHIS2 users" : "Add OpenMRS user",
);
const pageSubtext = computed(() =>
  isManager.value
    ? "Create a UCS User Manager account"
    : isDhis2.value
      ? "Synced from DHIS2 only"
      : "Register a team member in OpenMRS",
);

const facilitySuggestions = ref<Facility[]>([]);
const locationOptions = ref<Array<{ name: string; locationCode: string }>>([]);
const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();
const router = useRouter();

const teamRoles = ref<Array<{ uuid: string; name: string }>>([]);
const managerRoles = ref<Array<{ label: string; value: number }>>([]);
const rolesLoading = ref(false);
const icchwRoleUuid = import.meta.env.VITE_OPENMRS_ICCHW_TEAM_ROLE_UUID;
const phoneTaken = ref(false);

const managerForm = ref({
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  roleId: null as number | null,
});

async function loadOpenMrsTeamRoles() {
  const teamRolesResponse = await apiClient.get("/openmrs/teamrole");
  const typedData = teamRolesResponse.data as { data: Array<{ uuid: string; name: string }> };
  teamRoles.value = typedData.data || [];
  if (teamRoles.value.length && !form.value.selectedRole) {
    const defaultRole = teamRoles.value.find((r) => r.uuid === icchwRoleUuid) || teamRoles.value[0];
    form.value.selectedRole = defaultRole?.uuid || "";
  }
}

async function loadManagerRoles() {
  rolesLoading.value = true;
  try {
    const rolesResponse = await apiClient.get<{
      data: Array<{ id: number; name: string; description?: string }>;
    }>("/user/roles");
    managerRoles.value = (rolesResponse.data.data || []).map((r) => ({
      label: r.description ? `${r.name} — ${r.description}` : r.name,
      value: r.id,
    }));
  } finally {
    rolesLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await apiClient.get("/auth/me");
    if (isManager.value) {
      await loadManagerRoles();
    } else if (isOpenMrs.value) {
      await loadOpenMrsTeamRoles();
    }
  } catch (error) {
    rolesLoading.value = false;
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      authStore.logout(router, toast);
      router.push({ name: "Login" });
    } else {
      console.error("Error loading add-user form:", error);
    }
  }
});

watch(normalizedSystem, async (system) => {
  if (system === "manager") {
    teamRoles.value = [];
    await loadManagerRoles();
  } else if (system === "openmrs") {
    managerRoles.value = [];
    await loadOpenMrsTeamRoles();
  }
});

const selectedFacility = ref<Facility | null>(null);
watch(selectedFacility, async (val) => {
  if (!val?.hfrCode || !val?.parent) return;

  form.value.hfrCode = val.hfrCode;
  form.value.locationCode = "";
  locationOptions.value = [];

  try {
    const { data } = await apiClient.get(`/openmrs/location/facilities/hamlets/search?q=${val.parent}`);
    const typedData = data as { status: string; data: Array<{ name: string; locationCode: string }> };
    if (typedData.status === "success") {
      locationOptions.value = typedData.data.map((loc) => ({
        name: `${loc.name} - ${loc.locationCode}`,
        locationCode: loc.locationCode,
      }));
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
    locationOptions.value = [];
  }
});

const searchFacilities = async (event: { query: string }) => {
  const query = event.query;
  if (query.length < 4) return;

  try {
    const { data } = await apiClient.get(`/openmrs/location/facilities/search?q=${query}`);
    const typedData = data as { status: string; data: Array<{ hfrCode?: string; name?: string; parent?: string }> };
    if (typedData.status === "success") {
      facilitySuggestions.value = typedData.data
        .filter((f) => f.name && f.hfrCode && f.parent)
        .map((f) => ({
          name: f.name!,
          hfrCode: f.hfrCode!,
          parent: f.parent!,
        }));
    } else {
      facilitySuggestions.value = [];
    }
  } catch (error) {
    console.error("Error fetching facilities:", error);
    facilitySuggestions.value = [];
  }
};

const form = ref({
  firstName: "",
  middleName: "",
  lastName: "",
  NIN: "",
  sex: "",
  email: "",
  birthdate: null,
  phoneNumber: "",
  rawPhoneNumber: "",
  hfrCode: "",
  locationCode: "",
  selectedRole: "",
  username: "",
});

const sexOptions = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
];

const formatPhoneNumber = () => {
  if (!form.value.rawPhoneNumber) return;
  const raw = form.value.rawPhoneNumber.replace(/\D/g, "");
  if (/^0\d{9}$/.test(raw)) {
    form.value.phoneNumber = "+255" + raw.slice(1);
  }
};

const validateNIN = () => {
  const nin = form.value.NIN?.replace(/\D/g, "") || "";
  if (nin.length < 8) {
    toast.add({ severity: "error", summary: "Invalid NIN", detail: "NIN is invalid.", life: 3000 });
    return false;
  }
  const year = parseInt(nin.slice(0, 4), 10);
  const month = parseInt(nin.slice(4, 6), 10);
  const day = parseInt(nin.slice(6, 8), 10);
  const now = new Date();
  if (year < 1900 || year > now.getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
    toast.add({
      severity: "error",
      summary: "Invalid NIN",
      detail: "Check NIN; birthdate is not valid",
      life: 3000,
    });
    return false;
  }
  return true;
};

watch(
  () => form.value.phoneNumber,
  async (newPhoneNumber) => {
    if (!newPhoneNumber) return;
    const raw = newPhoneNumber.replace(/\D/g, "");
    if (/^0\d{9}$/.test(raw)) {
      phoneTaken.value = !(await checkUsernameAvailability("+255" + raw.slice(1)));
    } else {
      phoneTaken.value = false;
    }
  },
);

const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data } = await apiClient.get(`/openmrs/teammember/username/search?username=${username}`);
    const typedData = data as { data: { isAvailable: boolean } };
    return typedData.data?.isAvailable === true;
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

const handlePhoneBlur = async () => {
  if (!form.value.rawPhoneNumber) return;
  const raw = form.value.rawPhoneNumber.replace(/\D/g, "");
  if (/^0\d{9}$/.test(raw)) {
    form.value.phoneNumber = "+255" + raw.slice(1);
  } else {
    form.value.phoneNumber = "";
    phoneTaken.value = false;
    return;
  }
  const isAvailable = await checkUsernameAvailability(form.value.phoneNumber);
  phoneTaken.value = !isAvailable;
  if (!isAvailable) {
    toast.add({
      severity: "warn",
      summary: "Phone already used",
      detail: "This phone number is already registered",
      life: 3000,
    });
  }
};

const submitOpenMrsForm = async () => {
  authStore.loading = true;
  formatPhoneNumber();
  if (form.value.selectedRole === icchwRoleUuid && !form.value.phoneNumber) {
    authStore.loading = false;
    return;
  }
  if (form.value.selectedRole === icchwRoleUuid && !validateNIN()) {
    authStore.loading = false;
    return;
  }
  if (phoneTaken.value) {
    toast.add({
      severity: "error",
      summary: "Cannot Submit",
      detail: "Phone number already taken. Enter a different one.",
      life: 3000,
    });
    authStore.loading = false;
    return;
  }

  try {
    await apiClient.post("/user/chw", form.value);
    toast.add({ severity: "success", summary: "User added", detail: "OpenMRS user created", life: 2000 });
    await router.push({ name: "Users", query: { system: "openmrs", page: "last" } });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    toast.add({ severity: "error", summary: "Failed to add user", detail: errorMessage, life: 4000 });
  } finally {
    authStore.loading = false;
  }
};

const submitManagerForm = async () => {
  if (!managerForm.value.roleId) {
    toast.add({ severity: "warn", summary: "Role required", detail: "Select a role.", life: 3000 });
    return;
  }
  authStore.loading = true;
  try {
    await apiClient.post("/user", {
      firstName: managerForm.value.firstName,
      middleName: managerForm.value.middleName || undefined,
      lastName: managerForm.value.lastName,
      email: managerForm.value.email,
      phoneNumber: managerForm.value.phoneNumber || undefined,
      password: managerForm.value.password,
      roleId: managerForm.value.roleId,
    });
    toast.add({
      severity: "success",
      summary: "User created",
      detail: "Manager user added successfully",
      life: 2000,
    });
    await router.push({ name: "Users", query: { system: "manager", page: "last" } });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const detail = err.response?.data?.message || err.message || "Could not create user";
    toast.add({ severity: "error", summary: "Failed to create user", detail, life: 4000 });
  } finally {
    authStore.loading = false;
  }
};
</script>
