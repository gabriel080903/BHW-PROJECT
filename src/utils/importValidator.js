/**
 * Import Validator — validates JSON/CSV data before import
 * Prevents malformed or malicious data from corrupting records
 */

const REQUIRED_RESIDENT_FIELDS = ['firstName', 'lastName']
const VALID_GENDERS = ['Male', 'Female', 'Other', '']
const VALID_BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown','']

function sanitizeString(val, maxLen = 100) {
  if (val === null || val === undefined) return ''
  return String(val).trim().slice(0, maxLen)
}

function isValidDate(val) {
  if (!val) return true // optional
  const d = new Date(val)
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= new Date().getFullYear()
}

/**
 * Validates and sanitizes a single resident record.
 * Returns { valid: bool, errors: string[], data: sanitizedObject }
 */
export function validateResident(raw, index = 0) {
  const errors = []
  const label = `Row ${index + 1}`

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: [`${label}: Not a valid record`], data: null }
  }

  // Required fields
  for (const field of REQUIRED_RESIDENT_FIELDS) {
    if (!raw[field] || !String(raw[field]).trim()) {
      errors.push(`${label}: "${field}" is required`)
    }
  }

  // Gender
  if (raw.gender && !VALID_GENDERS.includes(raw.gender)) {
    errors.push(`${label}: Invalid gender "${raw.gender}" (must be Male, Female, or Other)`)
  }

  // Blood type
  if (raw.bloodType && !VALID_BLOOD_TYPES.includes(raw.bloodType)) {
    errors.push(`${label}: Invalid blood type "${raw.bloodType}"`)
  }

  // Birth date
  if (raw.birthDate && !isValidDate(raw.birthDate)) {
    errors.push(`${label}: Invalid birth date "${raw.birthDate}"`)
  }

  if (errors.length > 0) return { valid: false, errors, data: null }

  // Sanitize all string fields
  const data = {
    firstName:   sanitizeString(raw.firstName, 50),
    middleName:  sanitizeString(raw.middleName, 50),
    lastName:    sanitizeString(raw.lastName, 50),
    birthDate:   sanitizeString(raw.birthDate, 30),
    gender:      sanitizeString(raw.gender, 10),
    bloodType:   VALID_BLOOD_TYPES.includes(raw.bloodType) ? raw.bloodType : 'Unknown',
    purok:       sanitizeString(raw.purok, 100),
    place:       sanitizeString(raw.place, 100),
    contact:     sanitizeString(raw.contact, 20),
    allergies:   Array.isArray(raw.allergies) ? raw.allergies.map(a => sanitizeString(a, 50)) : [],
    medications: Array.isArray(raw.medications) ? raw.medications.map(m => sanitizeString(m, 50)) : [],
    vax:         Array.isArray(raw.vax) ? raw.vax : [],
    status:      ['active','inactive'].includes(raw.status) ? raw.status : 'active',
  }

  return { valid: true, errors: [], data }
}

/**
 * Validates a full JSON backup file before restore
 */
export function validateBackupFile(parsed) {
  const errors = []

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['File is not valid JSON'] }
  }

  if (!parsed.version) {
    errors.push('Warning: No version field found in backup')
  }

  if (parsed.residents !== undefined && !Array.isArray(parsed.residents)) {
    errors.push('"residents" must be an array')
  }

  if (parsed.records !== undefined && !Array.isArray(parsed.records)) {
    errors.push('"records" (nutrition records) must be an array')
  }

  if (parsed.inventory !== undefined && !Array.isArray(parsed.inventory)) {
    errors.push('"inventory" must be an array')
  }

  if (!parsed.residents && !parsed.records && !parsed.inventory) {
    errors.push('Backup file contains no recognizable data (residents, records, or inventory)')
  }

  if (errors.some(e => !e.startsWith('Warning'))) {
    return { valid: false, errors }
  }

  return { valid: true, errors /* warnings only */ }
}

/**
 * Batch validate an array of residents.
 * Returns { valid: resident[], invalid: {row, errors}[] }
 */
export function validateResidentBatch(rows) {
  const valid = []
  const invalid = []

  for (let i = 0; i < rows.length; i++) {
    const result = validateResident(rows[i], i)
    if (result.valid) {
      valid.push(result.data)
    } else {
      invalid.push({ row: i + 1, errors: result.errors })
    }
  }

  return { valid, invalid }
}
