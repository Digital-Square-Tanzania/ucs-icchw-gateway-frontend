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
        <MainLink v-if="auth.canAccessNav('/dashboard')" route="/dashboard" title="Dashboard" />
        <MainLink v-if="auth.canAccessNav('/users')" route="/users" title="Users" />
        <MainLink v-if="auth.canAccessAnalytics" route="/analytics" title="Analytics" />
        <MainLink v-if="auth.canAccessSettings" route="/settings" title="Settings" />
      </div>
      <div id="user-area" class="relative p-4">
        <button
          type="button"
          class="flex max-w-48 items-center gap-2 rounded-lg px-2 py-2 font-semibold text-white hover:bg-white/10"
          @click.stop="accountOpen = !accountOpen">
          <span class="truncate">{{ displayName }}</span>
          <i class="pi pi-chevron-down text-xs" aria-hidden="true" />
        </button>
        <div
          v-if="accountOpen"
          class="absolute right-4 z-20 mt-1 w-44 overflow-hidden rounded-lg bg-white py-1 text-sm text-gray-800 shadow-lg"
          @click.stop>
          <button type="button" class="block w-full px-3 py-2 text-left hover:bg-ucs-50" @click="openProfile">
            My Profile
          </button>
          <button type="button" class="block w-full px-3 py-2 text-left hover:bg-ucs-50" @click="logout">
            Logout
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- The main content area -->
  <main :class="{
    'relative z-3 mt-0 lg:mt-20 box-border bg-white dark:bg-ucs-700 lg:rounded-xl shadow-md dark:shadow-lg lg:w-[80vw] md:w-[100vw] sm:w-[100vw] lg:min-h-[70vh] p-5': route.path !== '/login',
    'relative z-3 mt-0 lg:mt-0 box-border bg-transparent  lg:w-[75vw] md:w-[100vw] sm:w-[100vw] lg:min-h-[60vh] p-5': route.path === '/login'
  }">
    <TransparentCover v-if="auth.loading" />
    <Toast />
    <ConfirmDialog />
    <ProfileDialog v-model:visible="profileOpen" />
    <RouterView :key="route.fullPath" />
    <p
      v-if="route.path !== '/login'"
      class="mt-2 text-center text-[0.65rem] text-gray-400 dark:text-gray-500"
      title="Frontend build id — confirms the deployed bundle">
      UI build {{ appBuildId }}
    </p>
  </main>
</template>

<script setup lang="ts">
import { useRouter, useRoute, RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import MainLink from './components/layout/MainLink.vue'
import ProfileDialog from './components/dialogs/ProfileDialog.vue'
import TransparentCover from './components/layout/TransparentCover.vue'
import { useSyncStore } from '@/stores/sync'

const auth = useAuthStore()
const syncStore = useSyncStore()

onMounted(() => {
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchProfile()
  }
  if (auth.isAuthenticated) {
    syncStore.initWebSocket()
  }
})

watch(
  () => auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      syncStore.initWebSocket()
    } else {
      syncStore.cleanupWebSocket()
    }
  },
)
const router = useRouter()
const toast = useToast()
const route = useRoute()
const appBuildId = __APP_BUILD_ID__

const accountOpen = ref(false)
const profileOpen = ref(false)
const displayName = computed(() => {
  const name = [auth.user?.firstName, auth.user?.lastName].filter(Boolean).join(' ')
  return name || auth.user?.email || 'Account'
})

function closeAccountMenu() {
  accountOpen.value = false
}

function openProfile() {
  accountOpen.value = false
  profileOpen.value = true
}

const logout = () => {
  accountOpen.value = false
  auth.logout(router, toast)
}

onMounted(() => document.addEventListener('click', closeAccountMenu))
onUnmounted(() => document.removeEventListener('click', closeAccountMenu))

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
