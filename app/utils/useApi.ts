import type { UseFetchOptions } from '#app'

export function useBaseApi<T>(path: string, options: UseFetchOptions<T> = {}) {
  const config = useRuntimeConfig()
  const baseUrl = config.public.flexiestaysApiUrl

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  const token = useCookie('flexiestays_token')

  if (token.value) {
    headers['Authorization'] = `Bearer ${token.value}`
  }

  return useFetch(baseUrl + path, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    },
    watch: false
  })
}

export function useApi<T>(path: string, options: UseFetchOptions<T> = {}) {
  return useBaseApi<T>(path, options)
}

export function useGet<T>(path: string, options: UseFetchOptions<T> = {}) {
  return useApi<T>(path, { method: 'GET', ...options })
}

export function usePost<T>(path: string, options: UseFetchOptions<T> = {}) {
  return useApi<T>(path, { method: 'POST', ...options })
}

export function usePut<T>(path: string, options: UseFetchOptions<T> = {}) {
  return useApi<T>(path, { method: 'PUT', ...options })
}

export function useDelete<T>(path: string, options: UseFetchOptions<T> = {}) {
  return useApi<T>(path, { method: 'DELETE', ...options })
}