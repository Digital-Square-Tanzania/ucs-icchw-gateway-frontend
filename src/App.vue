<template>
  <header id="top-bar"
    class="absolute left-0 top-0 z-1 bar-container h-1/3 w-screen bg-ucs-500 dark:bg-ucs-800 hidden lg:flex flex-row justify-between text-white dark:text-ucs-200 ">

    <!-- Page title goes here -->
    <div id="logo-area" class="w-2/10">
      <h2 class="flex text-2xl font-bold p-5">
        UCS User Manager
        <span class="bg-blue-100 text-blue-800 text-2xl font-semibold me-2 px-2.5 py-0.5 rounded-sm ms-2 hidden">
          MOH
        </span>
      </h2>
    </div>

    <!-- Main links go here -->
    <div id="right" class="flex flex-row justify-between w-1/3" v-if="auth.isAuthenticated">
      <div id="links-area" class="p-5">
        <MainLink route="/dashboard" title="Dashboard" />
        <MainLink route="/users" title="Users" />
        <MainLink route="/locations" title="Locations" />
        <MainLink route="/teams" title="Teams" />
      </div>
      <div id="user-area" class="p-4 tracking-wider w-1/4">
        <span
          class="flex flex-row items-center justify-start font-semibold text-white dark:text-ucs-300 cursor-pointer hover:text-ucs-100 transition-colors p-2"
          @click="logout">
          Logout
        </span>
      </div>
    </div>
  </header>

  <!-- The main content area -->
  <main :class="{
    'relative z-3 mt-0 lg:mt-20 box-border bg-white dark:bg-ucs-700 lg:rounded-xl shadow-md dark:shadow-lg lg:w-[85vw] md:w-[100vw] sm:w-[100vw] lg:min-h-[80vh] p-5': route.path !== '/login',
    'relative z-3 mt-0 lg:mt-0 box-border bg-transparent  lg:w-[80vw] md:w-[100vw] sm:w-[100vw] lg:min-h-[60vh] p-5': route.path === '/login'
  }">
    <TransparentCover v-if="auth.loading" />
    <Toast />
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { useRouter, useRoute, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { watch } from 'vue'
import MainLink from './components/layout/MainLink.vue'
import TransparentCover from './components/layout/TransparentCover.vue'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const route = useRoute()

const logout = () => {
  auth.logout(router, toast);
}

// Show 404 toast if visiting NotFound page
watch(route, () => {
  if (route.name === 'NotFound') {
    toast.add({
      severity: 'warn',
      summary: 'Page Not Found',
      detail: `The page "${route.path}" does not exist.`,
      life: 4000,
    })
  }
})
</script>
