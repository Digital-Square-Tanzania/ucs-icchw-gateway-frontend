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
          required />
        <Message v-if="rolesError" severity="error" size="small" class="mt-1">{{ rolesError }}</Message>
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

<script setup lang="ts">
import PageTitle from "@/components/layout/PageTitle.vue";
import { onMounted, ref } from "vue";
import { InputText, Select, Button, Message, Password } from "primevue";
import ApiClient from "@/utilities/ApiClient";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue/usetoast";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const apiClient = new ApiClient(authStore.accessToken);
const toast = useToast();
const router = useRouter();

const managerRoles = ref<Array<{ label: string; value: number }>>([]);
const rolesLoading = ref(false);
const rolesError = ref<string | null>(null);

const managerForm = ref({
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  roleId: null as number | null,
});

async function loadManagerRoles() {
  rolesLoading.value = true;
  rolesError.value = null;
  try {
    const rolesResponse = await apiClient.get<{
      data: Array<{ id: number; name: string; description?: string }>;
    }>("/user/roles");
    managerRoles.value = (rolesResponse.data.data || []).map((r) => ({
      label: r.description ? `${r.name} — ${r.description}` : r.name,
      value: r.id,
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
    await loadManagerRoles();
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
    const detail = typeof error === "string" ? error : "Could not create user";
    toast.add({ severity: "error", summary: "Failed to create user", detail, life: 4000 });
  } finally {
    authStore.loading = false;
  }
};
</script>
