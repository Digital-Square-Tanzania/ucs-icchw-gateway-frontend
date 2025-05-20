<template>
  <div id="login-box"
    class="flex lg:flex flex-row bg-white dark:bg-gray-800 shadow-lg lg:rounded-lg lg:m-20 lg:mt-40 lg:h-[65vh] md:h-[100vh] h-[100vh] lg:min-h-160 lg:min-w-180">
    <div id="box-left" class="flex w-full lg:w-1/2 md:w-2/3 lg:flex flex-col md:h-[90%] mt-4 sm:mt-10">
      <div id="left-bottom" class="box-border lg:h-3/4 sm:h-[90vh] flex flex-row justify-center">
        <div id="bottom-form" class="lg:w-3/5 md:w-4/5 flex flex-col justify-center">
          <form @submit.prevent="handleLogin" class="w-full max-w-sm">
            <h2 class="text-3xl font-bold dark:text-white lg:top-0">Login</h2>
            <br>
            <p class="text-md dark:text-white">Please enter your email and password to login</p>
            <div class="mb-4 mt-15 lg:mt-15 md:mt-4">
              <label for="email" class="block text-sm dark:text-white">E-mail</label>
              <input type="text" id="email" name="email" v-model="email"
                class="w-full px-2 text-lg py-4 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white shadow-sm" />
            </div>
            <div class="mb-4 mt-5">
              <label for="password" class="block text-sm dark:text-white">Password</label>
              <input type="password" id="password" name="password" v-model="password"
                class="w-full px-2 py-4 text-lg border border-gray-300 rounded-md dark:bg-gray-700 dark:text-white shadow-sm" />
            </div>
            <div class="mb-4 mt-5">
              <button type="submit" :disabled="auth.loading"
                class="w-full px-2 py-4 bg-ucs-500 text-lg hover:bg-ucs-600 cursor-pointer text-white rounded-md dark:bg-ucs-700 shadow-sm">
                {{ auth.loading ? 'Logging in...' : 'Login' }}
              </button>
            </div>
            <br>
            <p class="text-sm dark:text-white">Don't have an account? <strong class="text-ucs-500">Contact MOH</strong>
            </p>
          </form>
        </div>
      </div>

    </div>
    <div id="box-right"
      class="hidden md:flex flex-col items-center justify-center box-right box-border w-1/2 bg-ucs-50 rounded-r-lg dark:bg-gray-700">
      <div
        class="circle rounded-[50%] bg-ucs-500 dark:bg-ucs-600 h-60 w-60 z-1 absolute hover:animate-pulse cursor-pointer">
      </div>
      <div class="opaque h-60 w-[100%] z-2 relative top-30 backdrop-blur-lg"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

// Redirect if already logged in
onMounted(() => {
  if (auth.isAuthenticated) {
    router.push('/dashboard');
  }
});

const handleLogin = async () => {
  await auth.login(email.value, password.value, toast)
  if (auth.isAuthenticated) {
    router.push('/dashboard')
  } else if (auth.error) {
    console.log('danger', 'Error', auth.error)
  }
}

</script>
