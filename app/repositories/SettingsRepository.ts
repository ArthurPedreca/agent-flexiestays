import type {
  SettingsApiResponse,
  GeneralSettingItem,
  ColorSettingItem,
  GeneralSettings,
  ColorSettings
} from '~/types/Settings'
import { useBrowserGet } from '~/utils/useBrowserApi'
import { useSettingsStore } from '~/stores/settings'

/**
 * Normalizes raw API general settings to a structured object
 */
function normalizeGeneralSettings(items: GeneralSettingItem[]): GeneralSettings {
  const settingsMap = new Map(items.map(item => [item.key, item.value]))

  return {
    siteName: settingsMap.get('site_name') || 'Flexiestays',
    favicon: settingsMap.get('site_favicon') || '',
    darkLogo: settingsMap.get('site_dark_logo') || '',
    logo: settingsMap.get('site_logo') || '',
    metaPixel: settingsMap.get('site_meta_pixel') || '',
    tagManager: settingsMap.get('site_tag') || '',
    googleAds: settingsMap.get('site_google_ads') || ''
  }
}

/**
 * Normalizes raw API color settings to a structured object
 */
function normalizeColorSettings(items: ColorSettingItem[]): ColorSettings {
  const settingsMap = new Map(items.map(item => [item.key, item.value]))

  return {
    primary: settingsMap.get('primary_color') || '#0B0C26',
    secondary: settingsMap.get('secondary_color') || '#26284F',
    tertiary: settingsMap.get('tertiary_color') || '#4ce0cb',
    background: settingsMap.get('background_color') || '#F6F6FA',
    border: settingsMap.get('border_color') || '#caccdc'
  }
}

/**
 * Fetches general settings from the API
 */
export async function fetchGeneralSettings(): Promise<GeneralSettings> {
  const settingsStore = useSettingsStore()

  try {
    const response = await useBrowserGet<SettingsApiResponse<GeneralSettingItem>>(
      'settings/general'
    )

    if (response.status === 1 && response.data) {
      const normalizedSettings = normalizeGeneralSettings(response.data)
      settingsStore.setGeneralSettings(normalizedSettings)
      return normalizedSettings
    }

    throw new Error('Invalid response from general settings API')
  } catch (error) {
    console.error('Error fetching general settings:', error)
    throw error
  }
}

/**
 * Fetches color settings from the API
 */
export async function fetchColorSettings(): Promise<ColorSettings> {
  const settingsStore = useSettingsStore()

  try {
    const response = await useBrowserGet<SettingsApiResponse<ColorSettingItem>>(
      'settings/colors'
    )

    if (response.status === 1 && response.data) {
      const normalizedSettings = normalizeColorSettings(response.data)
      settingsStore.setColorSettings(normalizedSettings)
      return normalizedSettings
    }

    throw new Error('Invalid response from color settings API')
  } catch (error) {
    console.error('Error fetching color settings:', error)
    throw error
  }
}

/**
 * Fetches all settings (general + colors) in parallel
 */
export async function fetchAllSettings(): Promise<{
  general: GeneralSettings
  colors: ColorSettings
}> {
  const settingsStore = useSettingsStore()

  try {
    settingsStore.setLoading(true)

    const [general, colors] = await Promise.all([
      fetchGeneralSettings(),
      fetchColorSettings()
    ])

    settingsStore.setLoaded(true)

    return { general, colors }
  } catch (error) {
    console.error('Error fetching all settings:', error)
    throw error
  } finally {
    settingsStore.setLoading(false)
  }
}

/**
 * Refreshes all settings (bypasses cache)
 */
export async function refreshSettings(): Promise<{
  general: GeneralSettings
  colors: ColorSettings
}> {
  const settingsStore = useSettingsStore()
  settingsStore.setLoaded(false)

  return fetchAllSettings()
}
