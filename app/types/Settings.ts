// Settings API Response Types

export interface SettingItem<K extends string = string, V = string> {
  key: K
  value: V
  name: string
}

export interface SettingsApiResponse<T> {
  message: string
  data: T[]
  status: number
}

// General Settings Keys
export type GeneralSettingKey =
  | 'site_name'
  | 'site_favicon'
  | 'site_dark_logo'
  | 'site_logo'
  | 'site_meta_pixel'
  | 'site_tag'
  | 'site_google_ads'

export type GeneralSettingItem = SettingItem<GeneralSettingKey>

// Color Settings Keys
export type ColorSettingKey =
  | 'primary_color'
  | 'secondary_color'
  | 'tertiary_color'
  | 'background_color'
  | 'border_color'

export type ColorSettingItem = SettingItem<ColorSettingKey>

// Normalized Settings Objects (easier to use in components)
export interface GeneralSettings {
  siteName: string
  favicon: string
  darkLogo: string
  logo: string
  metaPixel: string
  tagManager: string
  googleAds: string
}

export interface ColorSettings {
  primary: string
  secondary: string
  tertiary: string
  background: string
  border: string
}

export interface AppSettings {
  general: GeneralSettings
  colors: ColorSettings
  isLoaded: boolean
  isLoading: boolean
}

// Default values
export const defaultGeneralSettings: GeneralSettings = {
  siteName: 'Flexiestays',
  favicon: '',
  darkLogo: '',
  logo: '',
  metaPixel: '',
  tagManager: '',
  googleAds: ''
}

export const defaultColorSettings: ColorSettings = {
  primary: '#0B0C26',
  secondary: '#26284F',
  tertiary: '#4ce0cb',
  background: '#F6F6FA',
  border: '#caccdc'
}
