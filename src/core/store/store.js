import {
  defaultStudents,
  defaultGallery,
  defaultTeachers,
  defaultSuperlatives,
  defaultMemories,
  defaultClassInfo
} from '../../data/defaultData.js';
import { DEFAULT_CLASS_ID } from '../../config/constants.js';

// Clean out legacy demo/fake localStorage entries if any exist
const legacyKeys = [
  'apsacs_students_data',
  'apsacs_gallery_data',
  'apsacs_teachers_data',
  'apsacs_superlatives_data',
  'apsacs_memories_data'
];
legacyKeys.forEach(k => {
  try { localStorage.removeItem(k); } catch {}
});

function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to localStorage`, err);
  }
}

class Store {
  constructor() {
    this.state = {
      user: null,
      isAdmin: false,
      currentClassId: DEFAULT_CLASS_ID,
      classInfo: defaultClassInfo,
      students: getStored('schoolhub_students', defaultStudents),
      gallery: getStored('schoolhub_gallery', defaultGallery),
      teachers: getStored('schoolhub_teachers', defaultTeachers),
      superlatives: getStored('schoolhub_superlatives', defaultSuperlatives),
      memories: getStored('schoolhub_memories', defaultMemories),
      activeCategory: 'All',
      searchQuery: '',
      currentStudentId: null,
      activeScreen: 'home'
    };
    this.listeners = new Map();
    this.isNotifying = new Set();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value, persist = true) {
    if (this.state[key] === value) return;
    this.state[key] = value;
    if (persist && ['students', 'gallery', 'teachers', 'superlatives', 'memories'].includes(key)) {
      setStored(`schoolhub_${key}`, value);
    }
    this.notify(key, value);
  }

  update(key, fn) {
    const nextVal = fn(this.state[key]);
    this.set(key, nextVal);
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => {
      const set = this.listeners.get(key);
      if (set) set.delete(callback);
    };
  }

  notify(key, value) {
    // Guard against re-entrant loops for the same key
    if (this.isNotifying.has(key)) return;
    this.isNotifying.add(key);

    try {
      const set = this.listeners.get(key);
      if (set) {
        set.forEach(cb => {
          try {
            cb(value, this.state);
          } catch (e) {
            console.error(`Error in listener for ${key}:`, e);
          }
        });
      }
      const wildcard = this.listeners.get('*');
      if (wildcard) {
        wildcard.forEach(cb => {
          try {
            cb(key, value, this.state);
          } catch (e) {
            console.error('Error in wildcard listener:', e);
          }
        });
      }
    } finally {
      this.isNotifying.delete(key);
    }
  }
}

export const store = new Store();
