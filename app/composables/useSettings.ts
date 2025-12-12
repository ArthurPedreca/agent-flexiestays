import * as SettingsRepository from '~/repositories/SettingsRepository'
import { useSettingsStore } from '~/stores/settings'

export function useSettings() {
  const settingsStore = useSettingsStore()

  // General Settings (reactive)
  const siteName = computed(() => settingsStore.getSiteName)
  const favicon = computed(() => settingsStore.getFavicon)
  const logo = computed(() => settingsStore.getLogo)
  const darkLogo = computed(() => settingsStore.getDarkLogo)
  const metaPixel = computed(() => settingsStore.getMetaPixel)
  const tagManager = computed(() => settingsStore.getTagManager)
  const googleAds = computed(() => settingsStore.getGoogleAds)

  // Color Settings (reactive)
  const primaryColor = computed(() => settingsStore.getPrimaryColor)
  const secondaryColor = computed(() => settingsStore.getSecondaryColor)
  const tertiaryColor = computed(() => settingsStore.getTertiaryColor)
  const backgroundColor = computed(() => settingsStore.getBackgroundColor)
  const borderColor = computed(() => settingsStore.getBorderColor)

  // All settings (reactive)
  const colors = computed(() => settingsStore.getAllColors)
  const general = computed(() => settingsStore.getAllGeneral)

  // Status (reactive)
  const isLoaded = computed(() => settingsStore.getIsLoaded)
  const isLoading = computed(() => settingsStore.getIsLoading)

  /**
   * Initialize settings - call this on app startup
   */
  async function initSettings() {
    return settingsStore.initSettings()
  }

  /**
   * Fetch general settings from API
   */
  async function fetchGeneralSettings() {
    return SettingsRepository.fetchGeneralSettings()
  }

  /**
   * Fetch color settings from API
   */
  async function fetchColorSettings() {
    return SettingsRepository.fetchColorSettings()
  }

  /**
   * Fetch all settings from API
   */
  async function fetchAllSettings() {
    return SettingsRepository.fetchAllSettings()
  }

  /**
   * Force refresh all settings
   */
  async function refreshSettings() {
    return SettingsRepository.refreshSettings()
  }

  /**
   * Get CSS custom properties object for inline styles
   */
  const cssVariables = computed(() => ({
    '--color-primary': settingsStore.getPrimaryColor,
    '--color-secondary': settingsStore.getSecondaryColor,
    '--color-tertiary': settingsStore.getTertiaryColor,
    '--color-background': settingsStore.getBackgroundColor,
    '--color-border': settingsStore.getBorderColor
  }))

  /**
   * Get the appropriate logo based on theme
   * @param isDark - Whether dark mode is active
   */
  function getLogoForTheme(isDark: boolean = false): string {
    return isDark ? settingsStore.getDarkLogo : settingsStore.getLogo
  }

  return {
    // General Settings
    siteName,
    favicon,
    logo,
    darkLogo,
    metaPixel,
    tagManager,
    googleAds,

    // Color Settings
    primaryColor,
    secondaryColor,
    tertiaryColor,
    backgroundColor,
    borderColor,

    // Grouped Settings
    colors,
    general,

    // Status
    isLoaded,
    isLoading,

    // Methods
    initSettings,
    fetchGeneralSettings,
    fetchColorSettings,
    fetchAllSettings,
    refreshSettings,

    // Utilities
    cssVariables,
    getLogoForTheme
  }
}
