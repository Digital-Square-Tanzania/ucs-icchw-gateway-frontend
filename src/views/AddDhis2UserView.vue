<template>
  <PageTitle heading="DHIS2 users" subtext="Synced from DHIS2 only — not created here" />

  <div
    class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
    DHIS2 users are not added manually. Use Settings to sync users from DHIS2.
    <button
      type="button"
      class="ml-2 font-medium text-ucs-600 underline"
      @click="router.push({ name: 'Users', query: { system: 'dhis2' } })">
      Back to DHIS2 users
    </button>
  </div>
</template>

<script setup lang="ts">
import PageTitle from "@/components/layout/PageTitle.vue";
import { useRouter } from "vue-router";

const router = useRouter();
</script>
