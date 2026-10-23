/**
 * Global constants for School Hub.
 * P0-9: Removed ADMIN_EMAILS (admin identity is solely admins/{uid} in Firestore).
 */

export const COLLECTIONS = {
  USERS:        'users',
  CLASSES:      'classes',
  CLASS_SECRETS:'classSecrets',
  ADMINS:       'admins',
  STUDENTS:     'students',
  TEACHERS:     'teachers',
  GALLERY:      'gallery',
  MEMORIES:     'memories',
  SUPERLATIVES: 'superlatives',
  GATE:         'gate',
  GATE_CONFIG:  'gateConfig',
  DRAFTS:       'drafts'
};

export const DEFAULT_CLASS_ID = '10-b';

export const LIMITS = {
  PAGE_SIZE_STUDENTS: 30,
  PAGE_SIZE_DEFAULT:  20,
  MAX_BIO_LENGTH:    500,
  MAX_MEMORY_LENGTH: 300,
  MAX_REPORT_COUNT_AUTOHIDE: 3,
  MAX_DISPLAY_NAME_LENGTH:    80,
  MAX_GATE_ATTEMPTS:           5,
  GATE_COOLDOWN_MINUTES:      10
};
