/**
 * Global Constants & Configurations for School Hub
 */

export const COLLECTIONS = {
  USERS: 'users',
  CLASSES: 'classes',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  GALLERY: 'gallery',
  MEMORIES: 'memories',
  SUPERLATIVES: 'superlatives',
  POLLS: 'polls',
  HOMEWORK: 'homework',
  TIMETABLE: 'timetable',
  REPORTS: 'reports'
};

export const DEFAULT_CLASS_ID = '10-b';

export const LIMITS = {
  MAX_BIO_LENGTH: 500,
  MAX_MEMORY_LENGTH: 300,
  MAX_REPORT_COUNT_AUTOHIDE: 3,
  SUPPORTERS_FOR_APPROVAL: 5,
  MAX_STUDENTS_PER_PAGE: 50
};

// Replace with your Firebase admin UID or set via admin panel
export const ADMIN_EMAILS = [
  'admin@aps-skardu.edu.pk'
];
