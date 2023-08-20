import { resolve } from 'path'
import { ProcessEnv } from 'npm-run-path'

type Environment = ProcessEnv & {
  NUXT_API_URL?: string
  NUXT_APP_ENV?: string
}

const env: Environment = process.env

export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      title: 'auth0training',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' }, // これを追記する
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
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt'],
})
