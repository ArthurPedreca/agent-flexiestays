import { defineStore } from 'pinia'
import type {
  GeneralSettings,
  ColorSettings,
  AppSettings
} from '~/types/Settings'
import {
  defaultGeneralSettings,
  defaultColorSettings
} from '~/types/Settings'

export const useSettingsStore = defineStore('settings', {
  state: (): AppSettings => ({
    general: { ...defaultGeneralSettings },
    colors: { ...defaultColorSettings },
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    // General Settings Getters
    getSiteName: (state) => state.general.siteName,
    getFavicon: (state) => state.general.favicon,
    getLogo: (state) => state.general.logo,
    getDarkLogo: (state) => state.general.darkLogo,
    getMetaPixel: (state) => state.general.metaPixel,
    getTagManager: (state) => state.general.tagManager,
    getGoogleAds: (state) => state.general.googleAds,

    // Color Settings Getters
    getPrimaryColor: (state) => state.colors.primary,
    getSecondaryColor: (state) => state.colors.secondary,
    getTertiaryColor: (state) => state.colors.tertiary,
    getBackgroundColor: (state) => state.colors.background,
    getBorderColor: (state) => state.colors.border,

    // All settings
    getAllColors: (state) => state.colors,
    getAllGeneral: (state) => state.general,

    // Status
    getIsLoaded: (state) => state.isLoaded,
    getIsLoading: (state) => state.isLoading
  },

  actions: {
    setGeneralSettings(settings: Partial<GeneralSettings>) {
      this.general = { ...this.general, ...settings }
    },

    setColorSettings(settings: Partial<ColorSettings>) {
      this.colors = { ...this.colors, ...settings }
    },

    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setLoaded(loaded: boolean) {
      this.isLoaded = loaded
    },

    reset() {
      this.general = { ...defaultGeneralSettings }
      this.colors = { ...defaultColorSettings }
      this.isLoaded = false
      this.isLoading = false
    },

    async initSettings() {
      if (this.isLoaded || this.isLoading) {
        return
      }

      this.isLoading = true

      try {
        const { fetchAllSettings } = await import('~/repositories/SettingsRepository')
        await fetchAllSettings()
      } catch (error) {
        console.error('Failed to initialize settings:', error)
      } finally {
        this.isLoading = false
      }
    }
  }
})
