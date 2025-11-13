<template>
  <PageTitle heading="UCS Users" subtext="Users Using UCS" />

  <div id="table-bg" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">

    <div id="table-top" class="flex flex-row justify-between px-4">
      <!-- Filter buttons -->
      <div id="filter-buttons" class="mb-4 flex gap-2">
        <button v-for="system in systems" :key="system.code" @click="selectSystem(system.code)"
          class="py-2 px-4 bg-ucs-300 dark:bg-ucs-600 text-ucs-50 dark:text-ucs-200 rounded-sm cursor-pointer hover:bg-ucs-400 dark:hover:bg-ucs-700 focus:cursor-not-allowed focus:bg-ucs-100 dark:focus:bg-ucs-900 focus:outline-none">
          {{ system.name }}
        </button>
        <Select v-model="selectedSystem" :options="systems" optionLabel="name" placeholder="Add New User" class="w-48"
          @change="navigateToAddUser" />
      </div>
      <div id="search-filter" class="w-1/4 ">
        <InputText v-model="searchQuery" placeholder="Search..." class="w-full" @input="filterUsers" />
      </div>
    </div>

    <!-- Table Data -->
    <DataTable :value="filteredUsers" paginator :rows="pageSize" :first="page * pageSize"
      :rowsPerPageOptions="[5, 10, 20, 50]" :lazy="true"
      :totalRecords="totalRecords" @page="onPageChange" :loading="loading" tableStyle="min-width: 50rem" stripedRows
      @rowSelect="onRowClick" selectionMode="single">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">{{ systemTitle }} Users</span>
          <span v-if="loading" class="text-gray-500">Loading...</span>
        </div>
      </template>

      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header">
        <template #body="slotProps">
          <span v-if="col.field === 'roleName'" :class="roleColor(slotProps.data.roleName)"
            class="text-xs px-2 py-0.5 rounded-md">
            {{ slotProps.data.roleName || "UNKNOWN" }}
          </span>
          <span v-else-if="col.field === 'teamName'"
            class="text-xs px-2 py-0.5 rounded-md bg-white-200 dark:bg-gray-700">
            {{ slotProps.data.teamName || "UNKNOWN" }}
          </span>
          <span v-else-if="col.field === 'locationName'"
            class="text-xs px-2 py-0.5 rounded-md bg-white-500 dark:bg-black-500">
            {{ slotProps.data.teamName || "UNKNOWN" }}
          </span>
          <span v-else>
            {{ slotProps.data[col.field] || "UNKNOWN" }}
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center text-gray-500">No users found.</div>
      </template>
    </DataTable>
    <UserDetailsDialog v-model="showDialog" :userUuid="selectedUser || null" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import PageTitle from "@/components/layout/PageTitle.vue";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue";
import UserDetailsDialog from "@/components/dialogs/UserDetailsDialog.vue";

const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();

const users = ref<any[]>([]);
const filteredUsers = ref<any[]>([]);
const searchQuery = ref<string>("");

function filterUsers() {
  filteredUsers.value = users.value.filter((user) =>
    Object.values(user).some((value) =>
      String(value).toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  );
}
const selectedSystem = ref<{ name: string; code: string } | null>(null);
const loading = ref<boolean>(false);
const page = ref<number>(0);
const pageSize = ref<number>(10);
const totalRecords = ref<number>(0);
const router = useRouter();
const route = useRoute();
const systemTitle = ref<string>("UCS");
const currentSystem = ref<string>("openmrs");
const shouldJumpToLastPage = ref<boolean>(false);

const openmrsColumns = ref([
  { field: "username", header: "Username" },
  { field: "firstName", header: "First Name" },
  { field: "middleName", header: "Middle Name" },
  { field: "lastName", header: "Last Name" },
  { field: "roleName", header: "Role" },
  { field: "teamName", header: "Team Name" },
  { field: "locationName", header: "Facility" },
  { field: "createdAt", header: "Deployed On" },
]);

const dhis2Columns = ref([
  { field: "username", header: "Username" },
  { field: "email", header: "Email" },
  { field: "firstName", header: "First Name" },
  { field: "lastName", header: "Last Name" },
  { field: "roles", header: "Roles" },
  { field: "facilityName", header: "Facility" },
  { field: "councilName", header: "Council" },
]);

const managerColumns = ref([
  { field: "email", header: "E-mail" },
  { field: "firstName", header: "First Name" },
  { field: "middleName", header: "Middle Name" },
  { field: "lastName", header: "Last Name" },
  { field: "role", header: "Role" },
  { field: "phoneNumber", header: "Phone" },
]);

const columns = ref([...openmrsColumns.value]);

const systems = ref([
  { name: "OpenMRS", code: "openmrs" },
  { name: "DHIS2", code: "dhis2" },
  { name: "Manager", code: "manager" },
]);

const showDialog = ref(false);
const selectedUser = ref(null);

async function fetchUsers(systemCode?: string) {
  loading.value = true;
  const activeSystem = systemCode ?? currentSystem.value ?? "openmrs";
  currentSystem.value = activeSystem;
  systemTitle.value = systems.value.find((s) => s.code === activeSystem)?.name || "UCS";

  let url = "/openmrs/teammember";
  let columnMapping = openmrsColumns.value;

  if (activeSystem === "dhis2") {
    url = "/dhis2/user";
    columnMapping = dhis2Columns.value;
  } else if (activeSystem === "manager") {
    url = "/user";
    columnMapping = managerColumns.value;
  }

  columns.value = columnMapping;

  try {
    const response = await apiClient.get<{ data: { users?: any[]; total?: number } }>(url, {
      params: { page: page.value + 1, pageSize: pageSize.value },
    });

    if (activeSystem === "dhis2") {
      users.value = response.data.data.users?.map((user) => ({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.join(", "), // Convert array to string
        facilityName: user.facilityName,
        councilName: user.councilName,
        email: user.email || "N/A",
      })) || [];
    } else if (activeSystem === "manager") {
      users.value = response.data.data.users?.map((user) => ({
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName || "N/A",
        lastName: user.lastName,
        role: user.role?.name || "UNKNOWN",
        phoneNumber: user.phoneNumber,
      })) || [];
    } else {
      users.value = response.data.data.users || [];
    }
    users.value = (response.data.data.users || []).map((user) => {
      if (user.createdAt) {
        const dt = new Date(user.createdAt);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        const hh = String(dt.getHours()).padStart(2, "0");
        const min = String(dt.getMinutes()).padStart(2, "0");
        return { ...user, createdAt: `${yyyy}-${mm}-${dd} ${hh}:${min}` };
      }
      return user;
    });
    filteredUsers.value = users.value;
    totalRecords.value = response.data.data.total || 0;
  } catch (error) {
    if ((error as any).response && (error as any).response.status === 401) {
      console.warn("🔒 Token expired. Logging out user...");
      toast.add({ severity: "warn", summary: "Session Expired", detail: "Your session has expired. Please log in again.", life: 3000 });
      authStore.logout(router, toast);
      router.push({ name: "Login" });
    } else {
      console.error(`Error fetching ${systemTitle.value} users:`, error);
    }
  } finally {
    loading.value = false;
  }
}

function selectSystem(systemCode: string) {
  if (systemCode !== currentSystem.value) {
    page.value = 0;
  }
  fetchUsers(systemCode);
}

function resolveQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" ? value : null;
}

function applyRoutePreferences() {
  const systemFromQuery = resolveQueryValue(route.query.system);
  if (systemFromQuery && systems.value.some((s) => s.code === systemFromQuery)) {
    currentSystem.value = systemFromQuery;
  } else {
    currentSystem.value = "openmrs";
  }

  const pageQuery = resolveQueryValue(route.query.page);
  shouldJumpToLastPage.value = pageQuery === "last";
}

async function goToLastPage() {
  if (!totalRecords.value) {
    shouldJumpToLastPage.value = false;
    return;
  }

  const lastPageIndex = Math.max(Math.ceil(totalRecords.value / pageSize.value) - 1, 0);
  if (lastPageIndex === page.value) {
    shouldJumpToLastPage.value = false;
    return;
  }

  page.value = lastPageIndex;
  await fetchUsers();
  shouldJumpToLastPage.value = false;
}

function clearPageQuery() {
  if (!route.query.page) return;
  const newQuery: Record<string, any> = { ...route.query };
  delete newQuery.page;
  router.replace({ name: "Users", query: newQuery });
}

function onRowClick(event: { data: any }) {
  selectedUser.value = event.data.uuid;
  showDialog.value = true;
}

function navigateToAddUser() {
  if (selectedSystem.value) {
    router.push(`/adduser/${selectedSystem.value.code}`);
  }
}

function onPageChange(event: { page: number; rows: number }) {
  page.value = event.page;
  pageSize.value = event.rows;
  fetchUsers();
}

function roleColor(role: string | null) {
  switch (role) {
    case "Supervisor":
      return "bg-blue-200 dark:bg-blue-900";
    case "iCCM Provider":
      return "bg-green-200 dark:bg-green-900";
    case "CHW":
      return "bg-amber-200 dark:bg-amber-900";
    case "COUNCIL":
      return "bg-purple-200 dark:bg-purple-900";
    case "SYS_DEV":
      return "bg-red-200 dark:bg-red-900";
    case "MOH_ADMIN":
      return "bg-orange-200 dark:bg-orange-900";
    default:
      return "bg-gray-200 dark:bg-gray-900";
  }
}

onMounted(async () => {
  applyRoutePreferences();
  await fetchUsers(currentSystem.value);

  if (shouldJumpToLastPage.value) {
    await goToLastPage();
    clearPageQuery();
  }
});
</script>
