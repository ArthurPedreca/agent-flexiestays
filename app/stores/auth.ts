import { defineStore } from 'pinia'
import type { User } from '~/types/User'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),

  getters: {
    getUser: (state) => state.user,
    getUserId: (state) => state.user?.id ?? null,
    getUserName: (state) => state.user ? `${state.user.firstName} ${state.user.lastName}` : null,
    getUserEmail: (state) => state.user?.email ?? null,
    getToken: () => useCookie('flexiestays_token').value ?? null,
    isLoggedIn: (state) => state.isAuthenticated && !!state.user
  },

  actions: {
    setUser(user: User | null) {
      this.user = user
      this.isAuthenticated = !!user
    },

    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    setToken(token: string | null) {
      const tokenCookie = useCookie('flexiestays_token', {
        maxAge: 60 * 60 * 24 * 7
      })
      tokenCookie.value = token
    },

    clearAuth() {
      this.user = null
      this.isAuthenticated = false
      this.setToken(null)
    },

    async initAuth() {
      const token = useCookie('flexiestays_token').value
      if (token && !this.user) {
        this.isLoading = true
        try {
          const { fetchUser } = await import('~/repositories/AuthRepository')
          await fetchUser()
        } catch (error) {
          console.error('Failed to fetch user on init:', error)
          this.clearAuth()
        } finally {
          this.isLoading = false
        }
      }
    }
  }
})