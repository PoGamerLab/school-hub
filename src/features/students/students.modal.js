import { store } from '../../core/store/store.js';
import { authService } from '../../core/auth/auth.js';
import { router } from '../../core/router/router.js';
import { showToast } from '../../components/toast/toast.js';
import { extractInitials } from '../../core/utils/ids.js';
import { updateDocument, setDocument, getDocument } from '../../core/db/firestore.js';
import { clearProfileCache } from './students.cache.js';

export function openProfileModal(existingProfile = null) {
  const user = authService.getCurrentUser();
  if (!user) return;

  const addStudentModal = document.getElementById('add-student-modal');
  const nameEl = document.getElementById('student-name');
  const houseEl = document.getElementById('student-house');
  const groupEl = document.getElementById('student-group');
  const catEl = document.getElementById('student-category');
  const tagsEl = document.getElementById('student-tags');
  const bioEl = document.getElementById('student-bio');
  const subjEl = document.getElementById('student-subject');
  const bdayMonthEl = document.getElementById('student-bday-month');
  const bdayDayEl = document.getElementById('student-bday-day');
  const quoteEl = document.getElementById('student-quote');
  const factEl = document.getElementById('student-fact');
  const contactEl = document.getElementById('student-contact');
  const showBdayEl = document.getElementById('student-show-birthday');
  const showContactEl = document.getElementById('student-show-contact');
  const showDirEl = document.getElementById('student-show-directory');
  const adminDirRow = document.getElementById('student-admin-dir-row');

  if (adminDirRow) {
    adminDirRow.classList.toggle('hidden-admin', !store.get('isAdmin'));
  }

  if (existingProfile) {
    if (nameEl) nameEl.value = existingProfile.name || '';
    if (houseEl) houseEl.value = existingProfile.house || 'Unity';
    if (groupEl) groupEl.value = existingProfile.group || 'Pre-Medical';
    if (catEl) catEl.value = existingProfile.category || 'Sports';
    if (tagsEl) tagsEl.value = existingProfile.tags || 'Cricket';
    if (bioEl) bioEl.value = existingProfile.bio || '';
    if (subjEl) subjEl.value = existingProfile.favSubject || 'Computer Science';
    if (existingProfile.birthday) {
      const parts = existingProfile.birthday.split(' ');
      if (parts.length === 2) {
        if (bdayDayEl) bdayDayEl.value = parts[0];
        if (bdayMonthEl) bdayMonthEl.value = parts[1];
      }
    }
    if (quoteEl) quoteEl.value = (existingProfile.favQuote || '').replace(/^"|"$/g, '');
    if (factEl) factEl.value = existingProfile.funFact || '';
    if (contactEl) contactEl.value = existingProfile.contact || '';
    if (showBdayEl) showBdayEl.checked = !!existingProfile.showBirthday;
    if (showContactEl) showContactEl.checked = !!existingProfile.showContact;
    if (showDirEl) showDirEl.checked = existingProfile.showInDirectory !== false;
  } else {
    if (nameEl) nameEl.value = user.displayName || '';
    if (houseEl) houseEl.value = '';
    if (groupEl) groupEl.value = '';
    if (catEl) catEl.value = '';
    if (tagsEl) tagsEl.value = '';
    if (bioEl) bioEl.value = '';
    if (subjEl) subjEl.value = '';
    if (bdayDayEl) bdayDayEl.value = '';
    if (bdayMonthEl) bdayMonthEl.value = '';
    if (quoteEl) quoteEl.value = '';
    if (factEl) factEl.value = '';
    if (contactEl) contactEl.value = '';
    if (showBdayEl) showBdayEl.checked = false;
    if (showContactEl) showContactEl.checked = false;
    if (showDirEl) showDirEl.checked = true;
  }

  const modalTitle = document.querySelector('#add-student-modal .modal-header h3');
  if (modalTitle) modalTitle.textContent = existingProfile ? 'Edit Your Student Profile' : 'Create Your Profile';
  addStudentModal?.classList.add('active');
}

export function initProfileForm() {
  const addStudentForm = document.getElementById('add-student-form');
  const addStudentModal = document.getElementById('add-student-modal');
  if (!addStudentForm) return;

  addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = authService.getCurrentUser();
    if (!user) {
      showToast('Please sign in with Google.', 'error');
      return;
    }

    const name = document.getElementById('student-name').value.trim();
    const house = document.getElementById('student-house')?.value || '';
    const group = document.getElementById('student-group')?.value || '';
    const category = document.getElementById('student-category')?.value || '';
    const tags = document.getElementById('student-tags')?.value || '';
    const bio = document.getElementById('student-bio').value.trim();
    const favSubject = document.getElementById('student-subject')?.value || '';
    const bdayMonth = document.getElementById('student-bday-month')?.value || '';
    const bdayDay = document.getElementById('student-bday-day')?.value || '';
    const birthday = (bdayMonth && bdayDay) ? `${bdayDay} ${bdayMonth}` : '';
    const favQuote = document.getElementById('student-quote').value.trim();
    const funFact = document.getElementById('student-fact').value.trim();
    const contact = document.getElementById('student-contact').value.trim();
    const showBirthday = document.getElementById('student-show-birthday')?.checked ?? false;
    const showContact = document.getElementById('student-show-contact')?.checked ?? false;
    const showDirEl = document.getElementById('student-show-directory');
    const showInDirectory = showDirEl ? !!showDirEl.checked : true;

    // Unicode/Urdu/Apostrophe name check (M1, E2)
    const NAME_REGEX = /^[\p{L}\p{M}\s.'-]{3,60}$/u;
    if (!name || name.length < 3 || !NAME_REGEX.test(name)) {
      showToast('Please enter a valid full name (3-60 characters, letters from any language, apostrophes or dots).', 'error');
      return;
    }

    // No silent defaults check (M2, E3)
    if (!house || !group || !category || !favSubject || !tags) {
      showToast('Please select your House, Academic Group, Special Interest, Subject, and Main Hobby.', 'error');
      return;
    }
    if (!bio || bio.length < 15) {
      showToast('Please write a short bio & ambition (at least 15 characters).', 'error');
      return;
    }
    if (!favQuote || favQuote.length < 8) {
      showToast('Please enter a favourite quote (at least 8 characters).', 'error');
      return;
    }
    if (!funFact || funFact.length < 8) {
      showToast('Please enter a fun fact (at least 8 characters).', 'error');
      return;
    }

    const payload = {
      classId: store.get('currentClassId') || '',
      ownerUid: user.uid,
      name,
      house,
      group,
      category,
      tags,
      bio,
      favSubject,
      favQuote: favQuote ? (favQuote.startsWith('"') ? favQuote : `"${favQuote}"`) : '',
      funFact,
      initials: extractInitials(name),
      showBirthday,
      showContact,
      showInDirectory,
      verified: true
    };

    // Always send birthday/contact fields — empty string when hidden
    // so the rule can see showBirthday==false with birthday=='' (allowed)
    payload.birthday = (showBirthday && birthday) ? birthday : '';
    payload.contact  = (showContact  && contact)  ? contact  : '';

    const existingStudents = store.get('students') || [];
    const existingRecord = existingStudents.find(s => (s.id || s.uid) === user.uid || s.ownerUid === user.uid)
                        || await getDocument('students', user.uid);
    const isExisting = !!existingRecord;

    if (isExisting) {
      // Preserve immutable fields from existing record
      payload.createdAt     = existingRecord.createdAt;
      payload.gradientIndex = existingRecord.gradientIndex ?? Math.floor(Math.random() * 8);
      payload.photoReports  = existingRecord.photoReports  || {};

      const prevSource = existingRecord.photoSource || 'none';
      payload.photoSource = prevSource;

      // When photo source is 'upload', keep thumb but clear google URL (rule: googlePhotoUrl==''
      // is allowed when photoSource!='google'). When source is 'google', keep google URL and
      // also keep any previously uploaded thumb so it isn't wiped on profile edits.
      if (prevSource === 'upload') {
        payload.photoThumb     = existingRecord.photoThumb || '';
        payload.googlePhotoUrl = '';                           // clear old google URL
      } else if (prevSource === 'google') {
        payload.photoThumb     = existingRecord.photoThumb || '';
        payload.googlePhotoUrl = existingRecord.googlePhotoUrl || '';
      } else {
        payload.photoThumb     = '';
        payload.googlePhotoUrl = '';
      }
    } else {
      payload.gradientIndex = Math.floor(Math.random() * 8);
      payload.photoSource   = 'none';
      payload.photoThumb    = '';
      payload.googlePhotoUrl = '';
      payload.photoReports  = {};
    }

    try {
      if (isExisting) {
        await updateDocument('students', user.uid, payload);
        clearProfileCache(user.uid);
        showToast('Profile updated successfully!', 'success');
      } else {
        // Student doc must be at students/{uid} — use setDocument with uid as key
        await setDocument('students', user.uid, { ...payload, createdAt: null }, true, 'createdAt');
        clearProfileCache(user.uid);
        showToast(`Profile published for ${name}!`, 'success');
      }

      const updatedUser = {
        ...user,
        displayName: name,
        profileDeletedReason: null,
        status: 'active'
      };
      authService.setUser(updatedUser);
      try {
        await updateDocument('users', user.uid, { displayName: name, profileDeletedReason: null, status: 'active' });
      } catch (e) {
        console.warn('Update user doc displayName error:', e);
      }

      addStudentForm.reset();
      if (addStudentModal) addStudentModal.classList.remove('active');
      router.navigate('profile', { id: user.uid });
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast(`Error: ${err.message}`, 'error');
    }
  });
}
