export interface Country {
  name: string
  code: string
  dialCode: string
  mask: string
  regex: RegExp
  example: string
}

export const countries: Country[] = [
  {
    name: 'Argentina',
    code: 'AR',
    dialCode: '+54',
    mask: '## ####-####',
    regex: /^\d{2} \d{4}-\d{4}$/,
    example: '11 1234-5678'
  },
  {
    name: 'Australia',
    code: 'AU',
    dialCode: '+61',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '412 345 678'
  },
  {
    name: 'Belgium',
    code: 'BE',
    dialCode: '+32',
    mask: '### ## ## ##',
    regex: /^\d{3} \d{2} \d{2} \d{2}$/,
    example: '123 45 67 89'
  },
  {
    name: 'Bolivia',
    code: 'BO',
    dialCode: '+591',
    mask: '# ### ####',
    regex: /^\d{1} \d{3} \d{4}$/,
    example: '7 123 4567'
  },
  {
    name: 'Brazil',
    code: 'BR',
    dialCode: '+55',
    mask: '(##) #####-####',
    regex: /^\(\d{2}\) \d{5}-\d{4}$/,
    example: '(11) 99999-9999'
  },
  {
    name: 'Canada',
    code: 'CA',
    dialCode: '+1',
    mask: '(###) ###-####',
    regex: /^\(\d{3}\) \d{3}-\d{4}$/,
    example: '(416) 123-4567'
  },
  {
    name: 'Chile',
    code: 'CL',
    dialCode: '+56',
    mask: '# ####-####',
    regex: /^\d{1} \d{4}-\d{4}$/,
    example: '9 1234-5678'
  },
  {
    name: 'Colombia',
    code: 'CO',
    dialCode: '+57',
    mask: '### ### ####',
    regex: /^\d{3} \d{3} \d{4}$/,
    example: '300 123 4567'
  },
  {
    name: 'Czech Republic',
    code: 'CZ',
    dialCode: '+420',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '602 123 456'
  },
  {
    name: 'Denmark',
    code: 'DK',
    dialCode: '+45',
    mask: '## ## ## ##',
    regex: /^\d{2} \d{2} \d{2} \d{2}$/,
    example: '20 12 34 56'
  },
  {
    name: 'France',
    code: 'FR',
    dialCode: '+33',
    mask: '## ## ## ## ##',
    regex: /^\d{2} \d{2} \d{2} \d{2} \d{2}$/,
    example: '01 23 45 67 89'
  },
  {
    name: 'Germany',
    code: 'DE',
    dialCode: '+49',
    mask: '### ### ####',
    regex: /^\d{3} \d{3} \d{4}$/,
    example: '030 123 4567'
  },
  {
    name: 'Greece',
    code: 'GR',
    dialCode: '+30',
    mask: '### ### ####',
    regex: /^\d{3} \d{3} \d{4}$/,
    example: '694 123 4567'
  },
  {
    name: 'India',
    code: 'IN',
    dialCode: '+91',
    mask: '##### #####',
    regex: /^\d{5} \d{5}$/,
    example: '98765 43210'
  },
  {
    name: 'Ireland',
    code: 'IE',
    dialCode: '+353',
    mask: '## ### ####',
    regex: /^\d{2} \d{3} \d{4}$/,
    example: '87 123 4567'
  },
  {
    name: 'Italy',
    code: 'IT',
    dialCode: '+39',
    mask: '### ### ####',
    regex: /^\d{3} \d{3} \d{4}$/,
    example: '312 345 6789'
  },
  {
    name: 'Japan',
    code: 'JP',
    dialCode: '+81',
    mask: '###-####-####',
    regex: /^\d{3}-\d{4}-\d{4}$/,
    example: '090-1234-5678'
  },
  {
    name: 'Mexico',
    code: 'MX',
    dialCode: '+52',
    mask: '## #### ####',
    regex: /^\d{2} \d{4} \d{4}$/,
    example: '55 1234 5678'
  },
  {
    name: 'Netherlands',
    code: 'NL',
    dialCode: '+31',
    mask: '# ####-####',
    regex: /^\d{1} \d{4}-\d{4}$/,
    example: '6 1234-5678'
  },
  {
    name: 'New Zealand',
    code: 'NZ',
    dialCode: '+64',
    mask: '## ### ####',
    regex: /^\d{2} \d{3} \d{4}$/,
    example: '21 123 4567'
  },
  {
    name: 'Norway',
    code: 'NO',
    dialCode: '+47',
    mask: '### ## ###',
    regex: /^\d{3} \d{2} \d{3}$/,
    example: '412 34 567'
  },
  {
    name: 'Paraguay',
    code: 'PY',
    dialCode: '+595',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '981 123 456'
  },
  {
    name: 'Peru',
    code: 'PE',
    dialCode: '+51',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '987 654 321'
  },
  {
    name: 'Poland',
    code: 'PL',
    dialCode: '+48',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '601 123 456'
  },
  {
    name: 'Portugal',
    code: 'PT',
    dialCode: '+351',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '912 345 678'
  },
  {
    name: 'Russia',
    code: 'RU',
    dialCode: '+7',
    mask: '(###) ###-##-##',
    regex: /^\(\d{3}\) \d{3}-\d{2}-\d{2}$/,
    example: '(912) 345-67-89'
  },
  {
    name: 'South Africa',
    code: 'ZA',
    dialCode: '+27',
    mask: '## ### ####',
    regex: /^\d{2} \d{3} \d{4}$/,
    example: '82 123 4567'
  },
  {
    name: 'South Korea',
    code: 'KR',
    dialCode: '+82',
    mask: '###-####-####',
    regex: /^\d{3}-\d{4}-\d{4}$/,
    example: '010-1234-5678'
  },
  {
    name: 'Spain',
    code: 'ES',
    dialCode: '+34',
    mask: '### ### ###',
    regex: /^\d{3} \d{3} \d{3}$/,
    example: '612 345 678'
  },
  {
    name: 'Sweden',
    code: 'SE',
    dialCode: '+46',
    mask: '###-### ## ##',
    regex: /^\d{3}-\d{3} \d{2} \d{2}$/,
    example: '070-123 45 67'
  },
  {
    name: 'Switzerland',
    code: 'CH',
    dialCode: '+41',
    mask: '## ### ## ##',
    regex: /^\d{2} \d{3} \d{2} \d{2}$/,
    example: '79 123 45 67'
  },
  {
    name: 'Turkey',
    code: 'TR',
    dialCode: '+90',
    mask: '### ### ####',
    regex: /^\d{3} \d{3} \d{4}$/,
    example: '532 123 4567'
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    dialCode: '+44',
    mask: '#### #######',
    regex: /^\d{3,5}\s?\d{3}\s?\d{3,4}$/,
    example: '7700 900123'
  },
  {
    name: 'United States',
    code: 'US',
    dialCode: '+1',
    mask: '(###) ###-####',
    regex: /^\(\d{3}\) \d{3}-\d{4}$/,
    example: '(555) 123-4567'
  },
  {
    name: 'Uruguay',
    code: 'UY',
    dialCode: '+598',
    mask: '# ### ####',
    regex: /^\d{1} \d{3} \d{4}$/,
    example: '9 123 4567'
  },
  {
    name: 'Venezuela',
    code: 'VE',
    dialCode: '+58',
    mask: '###-#######',
    regex: /^\d{3}-\d{7}$/,
    example: '414-1234567'
  }
]

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code)
}

export const getCountryByDialCode = (dialCode: string): Country | undefined => {
  return countries.find(country => country.dialCode === dialCode)
}
