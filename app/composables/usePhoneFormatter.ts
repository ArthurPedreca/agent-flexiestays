import { countries, type Country } from '~/data/countries'

export const usePhoneFormatter = () => {
  const applyMask = (value: string, mask: string): string => {
    if (!value || !mask) return value

    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')

    let maskedValue = ''
    let numberIndex = 0

    for (let i = 0; i < mask.length && numberIndex < numbers.length; i++) {
      if (mask[i] === '#') {
        maskedValue += numbers[numberIndex]
        numberIndex++
      } else {
        maskedValue += mask[i]
      }
    }

    return maskedValue
  }

  const removeMask = (value: string): string => {
    return value.replace(/\D/g, '')
  }

  const formatPhoneNumber = (value: string, country: Country): string => {
    if (!value || !country) return value
    return applyMask(value, country.mask)
  }

  const validatePhoneNumber = (value: string, country: Country): boolean => {
    if (!value || !country) return false
    return country.regex.test(value)
  }

  const getPhoneMask = (countryCode: string): string => {
    const country = countries.find(c => c.code === countryCode)
    return country?.mask || ''
  }

  const createPhoneWatcher = (
    phoneRef: Ref<string>,
    selectedCountry: Ref<Country | null>
  ) => {
    const formatPhone = (newValue: string) => {
      if (!selectedCountry.value) return newValue

      // Remove máscara anterior
      const numbersOnly = removeMask(newValue)

      // Aplica nova máscara
      return formatPhoneNumber(numbersOnly, selectedCountry.value)
    }

    // Watcher para aplicar máscara quando o valor muda
    watch(phoneRef, (newValue) => {
      if (!newValue || !selectedCountry.value) return

      const formatted = formatPhone(newValue)
      if (formatted !== newValue) {
        phoneRef.value = formatted
      }
    })

    // Watcher para reformatar quando o país muda
    watch(selectedCountry, (newCountry) => {
      if (!newCountry || !phoneRef.value) return

      // Remove máscara anterior e aplica nova
      const numbersOnly = removeMask(phoneRef.value)
      phoneRef.value = formatPhoneNumber(numbersOnly, newCountry)
    })

    return {
      formatPhone
    }
  }

  const getCountryExample = (countryCode: string): string => {
    const country = countries.find(c => c.code === countryCode)
    return country?.example || ''
  }

  return {
    formatPhoneNumber,
    validatePhoneNumber,
    getPhoneMask,
    createPhoneWatcher,
    getCountryExample,
    applyMask,
    removeMask
  }
}
