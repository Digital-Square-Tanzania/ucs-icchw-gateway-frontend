<template>
  <PageTitle heading="UCS Users" subtext="Users Using UCS" />

  <div id="table-bg" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <div class="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav
          class="inline-flex flex-wrap gap-1 rounded-xl bg-gray-100 dark:bg-gray-900/80 p-1"
          aria-label="User categories">
          <button
            v-for="system in systems"
            :key="system.code"
            type="button"
            :class="tabButtonClass(system.code)"
            @click="selectSystem(system.code)">
            {{ system.name }}
          </button>
        </nav>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 sm:order-1 lg:hidden">
            {{ systemTitle }} users
          </h3>
          <Button
            v-if="canAddUser"
            label="Add new user"
            icon="pi pi-user-plus"
            class="sm:order-3"
            @click="goToAddUser" />
        </div>
      </div>

      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0 flex-1">
          <p v-if="currentSystem === 'dhis2'" class="text-sm text-gray-600 dark:text-gray-300">
            DHIS2 users are maintained via sync. Use Settings to refresh from DHIS2.
          </p>

          <div v-else-if="currentSystem === 'openmrs'" class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              OpenMRS team roles
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                :class="roleChipClass(null)"
                @click="setRoleFilter(null)">
                All roles
              </button>
              <button
                v-for="role in openMrsTeamRoles"
                :key="role.uuid"
                type="button"
                :class="roleChipClass(role.name)"
                @click="setRoleFilter(role.name)">
                {{ role.name }}
              </button>
            </div>
            <p v-if="openMrsRolesLoading" class="text-xs text-gray-500">Loading roles…</p>
            <p v-else-if="!openMrsTeamRoles.length" class="text-xs text-amber-600 dark:text-amber-400">
              No team roles in the database. Sync team roles from Settings.
            </p>
          </div>
        </div>

        <div id="search-filter" class="w-full shrink-0 md:w-72">
          <InputText
            v-model="searchQuery"
            placeholder="Search by username or name..."
            class="w-full"
            @input="onSearchInput" />
          <p class="mt-1 text-[0.65rem] leading-snug text-gray-500 dark:text-gray-400">
            Searches all records by username, given name, family name, or second name only.
          </p>
        </div>
      </div>
    </div>

    <DataTable
      :value="users"
      paginator
      :rows="pageSize"
      :first="page * pageSize"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      :lazy="true"
      :totalRecords="totalRecords"
      class="mt-4"
      @page="onPageChange"
      :loading="loading"
      tableStyle="min-width: 50rem"
      stripedRows
      @rowSelect="onRowClick"
      :selectionMode="currentSystem === 'openmrs' ? 'single' : undefined">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">{{ systemTitle }} users</span>
          <span v-if="selectedOpenMrsRole" class="text-sm text-gray-500">
            Filtered by role: <strong>{{ selectedOpenMrsRole }}</strong>
          </span>
          <span v-else-if="loading" class="text-gray-500">Loading…</span>
        </div>
      </template>

      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header">
        <template #body="slotProps">
          <span
            v-if="col.field === 'roleName' || col.field === 'role'"
            :class="roleColor(displayRole(slotProps.data, col.field))"
            class="text-xs px-2 py-0.5 rounded-md font-medium inline-block">
            {{ displayRole(slotProps.data, col.field) || "UNKNOWN" }}
          </span>
          <span
            v-else-if="col.field === 'teamName'"
            class="text-xs px-2 py-0.5 rounded-md bg-white-200 dark:bg-gray-700">
            {{ slotProps.data.teamName || "UNKNOWN" }}
          </span>
          <span
            v-else-if="col.field === 'locationName'"
            class="text-xs px-2 py-0.5 rounded-md bg-white-500 dark:bg-black-500">
            {{ slotProps.data.locationName || "UNKNOWN" }}
          </span>
          <span v-else>
            {{ slotProps.data[col.field] ?? "—" }}
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
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import PageTitle from "@/components/layout/PageTitle.vue";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue";
import UserDetailsDialog from "@/components/dialogs/UserDetailsDialog.vue";

type SystemCode = "openmrs" | "dhis2" | "manager";

const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();
const router = useRouter();
const route = useRoute();

const users = ref<Record<string, unknown>[]>([]);
const searchQuery = ref("");
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const loading = ref(false);
const page = ref(0);
const pageSize = ref(10);
const totalRecords = ref(0);
const systemTitle = ref("OpenMRS");
const currentSystem = ref<SystemCode>("openmrs");
const shouldJumpToLastPage = ref(false);

const openMrsTeamRoles = ref<Array<{ uuid: string; name: string }>>([]);
const openMrsRolesLoading = ref(false);
const selectedOpenMrsRole = ref<string | null>(null);

const openmrsColumns = [
  { field: "username", header: "Username" },
  { field: "firstName", header: "First Name" },
  { field: "middleName", header: "Middle Name" },
  { field: "lastName", header: "Last Name" },
  { field: "roleName", header: "Role" },
  { field: "teamName", header: "Team Name" },
  { field: "locationName", header: "Facility" },
  { field: "createdAt", header: "Deployed On" },
];

const dhis2Columns = [
  { field: "username", header: "Username" },
  { field: "email", header: "Email" },
  { field: "firstName", header: "First Name" },
  { field: "lastName", header: "Last Name" },
  { field: "roles", header: "Roles" },
  { field: "facilityName", header: "Facility" },
  { field: "councilName", header: "Council" },
];

const managerColumns = [
  { field: "email", header: "E-mail" },
  { field: "firstName", header: "First Name" },
  { field: "middleName", header: "Middle Name" },
  { field: "lastName", header: "Last Name" },
  { field: "role", header: "Role" },
  { field: "phoneNumber", header: "Phone" },
];

const columns = ref([...openmrsColumns]);

const systems = [
  { name: "OpenMRS", code: "openmrs" as SystemCode },
  { name: "DHIS2", code: "dhis2" as SystemCode },
  { name: "Manager", code: "manager" as SystemCode },
];

const showDialog = ref(false);
const selectedUser = ref<string | null>(null);

const canAddUser = computed(
  () => currentSystem.value === "openmrs" || currentSystem.value === "manager",
);

function tabButtonClass(code: SystemCode) {
  const active = currentSystem.value === code;
  return [
    "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-white text-ucs-700 shadow-sm dark:bg-ucs-800 dark:text-white"
      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
  ];
}

function roleChipClass(roleName: string | null) {
  const active =
    (roleName === null && !selectedOpenMrsRole.value) ||
    (roleName !== null && selectedOpenMrsRole.value === roleName);
  return [
    "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
    active
      ? "border-ucs-500 bg-ucs-500 text-white"
      : "border-gray-300 bg-white text-gray-700 hover:border-ucs-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200",
    !active && roleName ? roleColor(roleName) : "",
  ];
}

function formatCreatedAt(value: unknown): string | null {
  if (!value) return null;
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return String(value);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function managerRoleName(role: unknown): string {
  if (!role) return "UNKNOWN";
  if (typeof role === "string") {
    try {
      const parsed = JSON.parse(role);
      if (parsed?.name) return String(parsed.name);
    } catch {
      return role;
    }
    return role;
  }
  if (typeof role === "object" && role !== null && "name" in role) {
    return String((role as { name?: string }).name || "UNKNOWN");
  }
  return "UNKNOWN";
}

function mapUsers(raw: unknown[], activeSystem: SystemCode) {
  return (raw || []).map((user) => {
    const row = user as Record<string, unknown>;
    if (activeSystem === "dhis2") {
      const roles = row.roles;
      return {
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName,
        roles: Array.isArray(roles) ? roles.join(", ") : roles,
        facilityName: row.facilityName,
        councilName: row.councilName,
        email: row.email || "N/A",
      };
    }
    if (activeSystem === "manager") {
      const roleLabel =
        row.roleName != null && row.roleName !== ""
          ? String(row.roleName)
          : managerRoleName(row.role);
      return {
        email: row.email,
        firstName: row.firstName,
        middleName: row.middleName || "—",
        lastName: row.lastName,
        role: roleLabel,
        phoneNumber: row.phoneNumber,
      };
    }
    return {
      ...row,
      createdAt: formatCreatedAt(row.createdAt) ?? row.createdAt,
    };
  });
}

function displayRole(row: Record<string, unknown>, field: string): string {
  if (field === "role" && row.roleName != null && row.roleName !== "") {
    return String(row.roleName);
  }
  const value = row[field];
  if (field === "role") return managerRoleName(value);
  return value != null ? String(value) : "";
}

async function fetchOpenMrsRoles() {
  openMrsRolesLoading.value = true;
  try {
    const response = await apiClient.get<{
      data: Array<{ uuid: string; name: string }>;
    }>("/openmrs/teamrole");
    openMrsTeamRoles.value = (response.data.data || [])
      .filter((r) => r?.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching OpenMRS team roles:", error);
  } finally {
    openMrsRolesLoading.value = false;
  }
}

async function fetchUsers(systemCode?: SystemCode) {
  loading.value = true;
  const activeSystem = systemCode ?? currentSystem.value;
  currentSystem.value = activeSystem;
  systemTitle.value = systems.find((s) => s.code === activeSystem)?.name || "UCS";

  let url = "/openmrs/teammember";
  let columnMapping = openmrsColumns;

  if (activeSystem === "dhis2") {
    url = "/dhis2/user";
    columnMapping = dhis2Columns;
  } else if (activeSystem === "manager") {
    url = "/user";
    columnMapping = managerColumns;
  }

  columns.value = columnMapping;

  try {
    const trimmedSearch = searchQuery.value.trim();
    const params: Record<string, string | number> = {
      page: page.value + 1,
      pageSize: pageSize.value,
    };
    if (trimmedSearch) params.search = trimmedSearch;
    if (activeSystem === "openmrs" && selectedOpenMrsRole.value) {
      params.roleName = selectedOpenMrsRole.value;
    }

    const response = await apiClient.get<{ data: { users?: unknown[]; total?: number } }>(url, {
      params,
    });

    const raw = response.data.data.users || [];
    users.value = mapUsers(raw, activeSystem);
    totalRecords.value = response.data.data.total || 0;
  } catch (error) {
    if ((error as { response?: { status?: number } }).response?.status === 401) {
      toast.add({
        severity: "warn",
        summary: "Session Expired",
        detail: "Your session has expired. Please log in again.",
        life: 3000,
      });
      authStore.logout(router, toast);
      router.push({ name: "Login" });
    } else {
      console.error(`Error fetching ${systemTitle.value} users:`, error);
    }
  } finally {
    loading.value = false;
  }
}

function selectSystem(systemCode: SystemCode) {
  if (systemCode !== currentSystem.value) {
    page.value = 0;
    searchQuery.value = "";
    selectedOpenMrsRole.value = null;
  }
  router.replace({ name: "Users", query: { system: systemCode } });
  fetchUsers(systemCode);
  if (systemCode === "openmrs" && !openMrsTeamRoles.value.length) {
    fetchOpenMrsRoles();
  }
}

function setRoleFilter(roleName: string | null) {
  selectedOpenMrsRole.value = roleName;
  page.value = 0;
  fetchUsers("openmrs");
}

function goToAddUser() {
  const system = currentSystem.value;
  if (system === "manager") {
    router.push({ name: "AddManagerUser" });
  } else if (system === "dhis2") {
    router.push({ name: "AddDhis2User" });
  } else {
    router.push({ name: "AddOpenMrsUser" });
  }
}

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    page.value = 0;
    fetchUsers();
  }, 300);
}

function resolveQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function applyRoutePreferences() {
  const systemFromQuery = resolveQueryValue(route.query.system);
  if (systemFromQuery && systems.some((s) => s.code === systemFromQuery)) {
    currentSystem.value = systemFromQuery as SystemCode;
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
  const newQuery = { ...route.query };
  delete newQuery.page;
  router.replace({ name: "Users", query: newQuery });
}

function onRowClick(event: { data: { uuid?: string } }) {
  if (currentSystem.value !== "openmrs" || !event.data?.uuid) return;
  selectedUser.value = event.data.uuid;
  showDialog.value = true;
}

function onPageChange(event: { page: number; rows: number }) {
  page.value = event.page;
  pageSize.value = event.rows;
  fetchUsers();
}

function roleColor(role: string | null) {
  const key = (role || "").trim();
  switch (key) {
    case "Supervisor":
      return "bg-blue-200 dark:bg-blue-900";
    case "iCCM Provider":
      return "bg-green-200 dark:bg-green-900";
    case "CHW":
      return "bg-amber-200 dark:bg-amber-900";
    case "COUNCIL":
    case "COUNCIL_COORDINATOR":
      return "bg-purple-200 dark:bg-purple-900";
    case "SYS_DEV":
    case "UCS_DEVELOPER":
      return "bg-red-200 dark:bg-red-900";
    case "MOH_ADMIN":
      return "bg-orange-200 dark:bg-orange-900";
    case "EXTERNAL_SYSTEM":
      return "bg-slate-200 dark:bg-slate-800";
    default:
      return "bg-gray-200 dark:bg-gray-900";
  }
}

onMounted(async () => {
  applyRoutePreferences();
  if (currentSystem.value === "openmrs") {
    await fetchOpenMrsRoles();
  }
  await fetchUsers(currentSystem.value);
  if (shouldJumpToLastPage.value) {
    await goToLastPage();
    clearPageQuery();
  }
});
</script>
