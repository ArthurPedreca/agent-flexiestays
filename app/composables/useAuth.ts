import * as AuthRepository from '~/repositories/AuthRepository'
import { useAuthStore } from '~/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()

  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isLoggedIn)
  const isLoading = computed(() => authStore.isLoading)
  const token = computed(() => authStore.getToken)

  async function loginWithEmail(email: string, password: string, skipRedirect = false) {
    return AuthRepository.loginWithEmail(email, password, skipRedirect)
  }

  async function loginWithPhone(phoneNumber: string, password: string, skipRedirect = false) {
    return AuthRepository.loginWithPhone(phoneNumber, password, skipRedirect)
  }

  async function logout() {
    return AuthRepository.logout()
  }

  async function fetchUser() {
    return AuthRepository.fetchUser()
  }

  async function checkUserExists(emailOrPhone: { email?: string; phone_number?: string }) {
    return AuthRepository.checkUser(emailOrPhone)
  }

  async function forgotPassword(email: string) {
    return AuthRepository.forgotPassword(email)
  }

  async function resetPassword(data: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }) {
    return AuthRepository.resetPassword(data)
  }

  async function initAuth() {
    return authStore.initAuth()
  }

  function getToken(): string | null {
    return authStore.getToken
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    token,
    loginWithEmail,
    loginWithPhone,
    logout,
    fetchUser,
    checkUserExists,
    forgotPassword,
    resetPassword,
    initAuth,
    getToken
  }
}