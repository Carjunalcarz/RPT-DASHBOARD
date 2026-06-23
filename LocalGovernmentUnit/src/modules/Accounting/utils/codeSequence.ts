const MAX_CODE_LENGTH = 5

export const sanitizeNumericCode = (value: string): string => value.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH)

export const isValidNumericCode = (value: string): boolean => /^\d{1,5}$/.test(value)

export const getNextNumericCode = (codes: string[]): string => {
  const numericCodes = codes
    .map((code) => sanitizeNumericCode(code))
    .filter((code) => code.length > 0)

  if (numericCodes.length === 0) return '1'

  const maxValue = numericCodes.reduce((max, code) => Math.max(max, Number.parseInt(code, 10)), 0)

  if (maxValue >= 99999) return '99999'

  const nextValue = maxValue + 1
  const maxWidth = numericCodes.reduce((max, code) => Math.max(max, code.length), 1)
  const targetWidth = Math.min(Math.max(maxWidth, String(nextValue).length), MAX_CODE_LENGTH)

  return String(nextValue).padStart(targetWidth, '0')
}
