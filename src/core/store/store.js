import {
  defaultStudents,
  defaultGallery,
  defaultTeachers,
  defaultSuperlatives,
  defaultMemories,
  defaultClassInfo
} from '../../data/defaultData.js';
import { DEFAULT_CLASS_ID } from '../../config/constants.js';

// Local storage fallback helpers
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
      students: getStored('apsacs_students_data', defaultStudents),
      gallery: getStored('apsacs_gallery_data', defaultGallery),
      teachers: getStored('apsacs_teachers_data', defaultTeachers),
      superlatives: getStored('apsacs_superlatives_data', defaultSuperlatives),
      memories: getStored('apsacs_memories_data', defaultMemories),
      activeCategory: 'All',
      searchQuery: '',
      currentStudentId: 'ali-hassan',
      activeScreen: 'home'
    };
    this.listeners = new Map();
  }

  get(key) {
    return this.state[key];
  }

  set(key, value, persist = true) {
    this.state[key] = value;
    if (persist && ['students', 'gallery', 'teachers', 'superlatives', 'memories'].includes(key)) {
      setStored(`apsacs_${key}_data`, value);
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
    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) set.delete(callback);
    };
  }

  notify(key, value) {
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
    // Also notify wildcard listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach(cb => cb(key, value, this.state));
    }
  }
}

export const store = new Store();
