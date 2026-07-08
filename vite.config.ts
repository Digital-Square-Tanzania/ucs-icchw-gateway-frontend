import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
dotenv.config()

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [vue(), tailwindcss()]

  // Load vue-devtools only for the dev server. It is imported dynamically so
  // @vue/devtools-kit (which touches localStorage at import time) is never
  // evaluated during `build`, where some Node versions expose a partial
  // localStorage global and crash config loading.
  if (command === 'serve') {
    const { default: vueDevTools } = await import('vite-plugin-vue-devtools')
    const devtoolsPlugin = vueDevTools()
    if (Array.isArray(devtoolsPlugin)) {
      plugins.push(...devtoolsPlugin)
    } else if (devtoolsPlugin) {
      plugins.push(devtoolsPlugin)
    }
  }

  return {
    plugins,
    server: {
      port: parseInt(process.env.VITE_PORT || '3015'),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    base: '/manager/',
  }
})
