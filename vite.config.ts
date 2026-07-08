import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import dotenv from 'dotenv'
dotenv.config()

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [vue(), tailwindcss()]

  if (command === 'serve') {
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
