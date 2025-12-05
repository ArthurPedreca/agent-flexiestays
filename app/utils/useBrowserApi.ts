export function useBaseBrowserApi<T>(path: string, options: any = {}) {
  const config = useRuntimeConfig()
  const baseUrl = config.public.flexiestaysApiUrl

  const token = useCookie('flexiestays_token')

  const isFormData = options.body instanceof FormData

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token.value && { 'Authorization': `Bearer ${token.value}` })
  }

  return $fetch<T>(baseUrl + path, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
}

export function useBrowserApi<T>(path: string, options: any = {}) {
  return useBaseBrowserApi<T>(path, options)
}

export function useBrowserGet<T>(path: string, options: any = {}) {
  return useBrowserApi<T>(path, { method: 'GET', ...options })
}

export function useBrowserPost<T>(path: string, options: any = {}) {
  return useBrowserApi<T>(path, { method: 'POST', ...options })
}

export function useBrowserPut<T>(path: string, options: any = {}) {
  return useBrowserApi<T>(path, { method: 'PUT', ...options })
}

export function useBrowserDelete<T>(path: string, options: any = {}) {
  return useBrowserApi<T>(path, { method: 'DELETE', ...options })
}