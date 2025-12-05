export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const siteKey = config.public.recaptchaSiteKey

  const isDevelopment = process.env.NODE_ENV === 'development'
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '')

  if (isDevelopment && isLocalhost) {
    console.warn('reCAPTCHA: Development mode detected - script not loaded for localhost')
    return
  }

  if (!siteKey) {
    console.warn('reCAPTCHA: Site key not configured')
    return
  }

  if (typeof document === 'undefined') {
    return
  }

  if (!document.querySelector('#recaptcha-script')) {
    const script = document.createElement('script')
    script.id = 'recaptcha-script'
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true

    script.onerror = (error) => {
      console.error('reCAPTCHA: Failed to load script', error)
    }

    script.onload = () => {
      console.log('reCAPTCHA: Script loaded successfully')
    }

    document.head.appendChild(script)
  }
})