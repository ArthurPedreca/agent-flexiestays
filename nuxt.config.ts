const defaultN8nWebhook = 'https://skoobiedigital.app.n8n.cloud/webhook-test/flexiestays-agent'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mdc',
    'nuxt-auth-utils',
    'nuxt-charts',
    '@pinia/nuxt'
  ],
  pinia: {
    storesDirs: ['./app/stores/**']
  },
  devtools: {
    enabled: true
  },
  compatibilityDate: '2024-07-11',
  css: ['~/assets/css/main.css'],
  experimental: {
    viewTransition: true
  },
  mdc: {
    headings: {
      anchorLinks: false
    },
    highlight: {
      // noApiRoute: true
      shikiEngine: 'javascript'
    }
  },
  nitro: {
    experimental: {
      openAPI: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  runtimeConfig: {
    // Private keys (server-side only)
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || defaultN8nWebhook,
    n8nWebhookToken: process.env.N8N_WEBHOOK_TOKEN || '',
    // Public keys (client-side accessible)
    public: {
      n8nWebhookUrl: process.env.NUXT_PUBLIC_N8N_WEBHOOK_URL
        || process.env.N8N_WEBHOOK_URL
        || defaultN8nWebhook,
      n8nTitleWebhookUrl: process.env.NUXT_PUBLIC_N8N_TITLE_WEBHOOK_URL || '',
      flexiestaysApiUrl: process.env.NUXT_PUBLIC_FLEXIESTAYS_API_URL,
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY
    }
  }
})
