import type { User } from '~/types/User'
import type { ApiResponse } from '~/types/ApiResponse'
import { useGet } from '~/utils/useApi'
import { useBrowserPost } from '~/utils/useBrowserApi'
import { useAuthStore } from '~/stores/auth'
import { useFlexiToast } from '~/composables/useFlexiToast'
import { useRecaptcha } from '~/composables/useRecaptcha'

type LoginForm = {
  password?: string
  email?: string
  phone_number?: string
  recaptcha_token: string
}

type LoginResponse = {
  access_token: string
  expires_in?: number
  user: User
}

type RegisterForm = {
  firstName: string
  lastName: string
  email: string
  phone_number: string
  password: string
  password_confirmation: string
  birth_date: string
  ref?: string
  recaptcha_token: string
}

type RegisterResponse = {
  message: string
  user: User
  token: string
}

type CheckUserResponse = {
  exists: boolean
}

type CheckUserBody = {
  email?: string
  phone_number?: string
}

type LogoutResponse = {
  message: string
}

function getToast() {
  return useFlexiToast()
}

export async function login(
  body: LoginForm,
  skipRedirect = false
): Promise<LoginResponse | undefined> {
  const { successToast, errorToast } = getToast()
  const authStore = useAuthStore()

  try {
    authStore.setLoading(true)

    const response = await useBrowserPost<ApiResponse<LoginResponse>>('login', {
      body
    })

    authStore.setToken(response.data.access_token)
    authStore.setUser(response.data.user || null)

    successToast('Logged in successfully!')

    if (skipRedirect) {
      return response.data
    }

    await navigateTo('/')
    return undefined
  } catch (error: any) {
    errorToast('Error when logging in. Please verify your credentials.')
    throw new Error(error.data?.message || 'Error when logging in')
  } finally {
    authStore.setLoading(false)
  }
}

export async function loginWithEmail(
  email: string,
  password: string,
  skipRedirect = false
): Promise<LoginResponse | undefined> {
  const { execute } = useRecaptcha()
  const recaptchaToken = await execute('login')

  return login({
    email,
    password,
    recaptcha_token: recaptchaToken
  }, skipRedirect)
}

export async function loginWithPhone(
  phone_number: string,
  password: string,
  skipRedirect = false
): Promise<LoginResponse | undefined> {
  const { execute } = useRecaptcha()
  const recaptchaToken = await execute('login')

  return login({
    phone_number,
    password,
    recaptcha_token: recaptchaToken
  }, skipRedirect)
}

export async function register(body: RegisterForm): Promise<void> {
  const { successToast, errorToast } = getToast()
  const authStore = useAuthStore()

  try {
    authStore.setLoading(true)

    const response = await useBrowserPost<ApiResponse<RegisterResponse>>('create-user', {
      body
    })

    authStore.setToken(response.data.token)
    authStore.setUser(response.data.user || null)

    successToast('Registered successfully!')
    navigateTo('/')
  } catch (error: any) {
    errorToast('Error when creating account.')
    throw new Error(error.data?.message || 'Error when creating user')
  } finally {
    authStore.setLoading(false)
  }
}

export async function logout(): Promise<void> {
  const { successToast, errorToast } = getToast()
  const authStore = useAuthStore()

  try {
    const { error } = await useGet<ApiResponse<LogoutResponse>>('logout')

    if (error.value) {
      errorToast('Error when logging out')
      throw new Error(error.value.data?.message || 'Logout error')
    }

    authStore.clearAuth()
    successToast('Logged out successfully!')

    await navigateTo('/')
  } catch (error: any) {
    authStore.clearAuth()
    throw error
  }
}

export async function fetchUser(): Promise<void> {
  const { errorToast } = getToast()
  const authStore = useAuthStore()

  const { data, error } = await useGet<ApiResponse<User>>('get-user')

  if (error.value) {
    errorToast('Error when fetching user')
    throw new Error(error.value.message || 'Error when fetching user')
  }

  authStore.setUser(data.value?.data || null)
}

export async function checkUser(body: CheckUserBody): Promise<ApiResponse<CheckUserResponse>> {
  const { errorToast } = getToast()

  try {
    const response = await useBrowserPost<ApiResponse<CheckUserResponse>>('check-user', {
      body
    })
    return response
  } catch (error: any) {
    errorToast('Error when checking user')
    throw new Error(error.data?.message || 'Error when checking user')
  }
}

export async function forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
  const { errorToast } = getToast()

  try {
    const response = await useBrowserPost<ApiResponse<{ message: string }>>('forgot-password', {
      body: { email }
    })
    return response
  } catch (error: any) {
    errorToast('Error when sending reset password email')
    throw new Error(error.data?.message || 'Error when sending reset password email')
  }
}

export async function resetPassword(body: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<ApiResponse<{ message: string; user: User; token: string }>> {
  const { errorToast } = getToast()
  const authStore = useAuthStore()

  try {
    const response = await useBrowserPost<ApiResponse<{ message: string; user: User; token: string }>>('reset-password', {
      body
    })

    if (response.data) {
      authStore.setToken(response.data.token)
      authStore.setUser(response.data.user)
    }

    return response
  } catch (error: any) {
    errorToast('Error when resetting password')
    throw new Error(error.data?.message || 'Error when resetting password')
  }
}

export function getAuthToken(): string | null {
  const authStore = useAuthStore()
  return authStore.getToken
}

export function isAuthenticated(): boolean {
  const authStore = useAuthStore()
  return authStore.isLoggedIn
}