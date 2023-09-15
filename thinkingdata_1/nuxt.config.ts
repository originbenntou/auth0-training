import { resolve } from 'path'
import { ProcessEnv } from 'npm-run-path'

type Environment = ProcessEnv & {
  NUXT_API_URL?: string
  NUXT_APP_ENV?: string
  NUXT_TE_APP_ID?: string
  NUXT_TE_ENDPOINT?: string
}

const env: Environment = process.env

export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      title: 'thinkingdata_demo',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  css: ['~/src/assets/css/style.scss'],
  nitro: {
    preset: 'node-server',
  },
  srcDir: 'src/',
  alias: {
    '~': resolve(__dirname),
    '@': resolve(__dirname),
  },
  runtimeConfig: {
    public: {
      baseURL: env.NUXT_API_URL || 'http://localhost',
      teAppId: env.NUXT_TE_APP_ID || '',
      teEndpoint: env.NUXT_TE_ENDPOINT || '',
    },
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
  typescript: {
    tsConfig: {
      extends: '@tsconfig/strictest/tsconfig.json',
    },
  },
  modules: ['@pinia/nuxt', '@vueuse/nuxt'],
})
