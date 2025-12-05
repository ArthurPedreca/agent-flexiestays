declare const grecaptcha: {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

export function useRecaptcha() {
  const config = useRuntimeConfig()
  const siteKey = config.public.recaptchaSiteKey

  const isDevelopment = process.env.NODE_ENV === 'development'
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '')

  const execute = async (action: string): Promise<string> => {
    if (isDevelopment && isLocalhost) {
      console.warn('reCAPTCHA: Using development mode - returning fake token')
      return 'dev-token-' + Date.now()
    }

    if (!siteKey) {
      throw new Error('reCAPTCHA site key is not configured')
    }

    if (typeof window === 'undefined') {
      throw new Error('reCAPTCHA is only available in browser environment')
    }

    if (typeof grecaptcha === 'undefined') {
      console.warn('reCAPTCHA script not loaded yet, waiting...')
      await new Promise<void>((resolve, reject) => {
        let attempts = 0
        const maxAttempts = 50

        const checkScript = () => {
          attempts++
          if (typeof grecaptcha !== 'undefined') {
            resolve()
          } else if (attempts >= maxAttempts) {
            reject(new Error('reCAPTCHA script failed to load'))
          } else {
            setTimeout(checkScript, 100)
          }
        }
        checkScript()
      })
    }

    await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()))

    try {
      return await grecaptcha.execute(siteKey, { action })
    } catch (error) {
      console.error('reCAPTCHA execution error:', error)

      if (isDevelopment) {
        console.warn('reCAPTCHA: Error in development mode - returning fake token')
        return 'dev-error-token-' + Date.now()
      }

      throw new Error('Failed to execute reCAPTCHA')
    }
  }

  return { execute }
}