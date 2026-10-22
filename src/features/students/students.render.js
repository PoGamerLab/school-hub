import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderStudentCard(student) {
  const safeId = escapeAttr(student.id || student.uid);
  const safeName = escapeHtml(student.name);
  const safeTags = escapeHtml(student.tags);
  const safeRoll = escapeHtml(student.roll);
  const safeInitials = escapeHtml(student.initials || 'ST');
  const gradientClass = `gradient-${typeof student.gradientIndex === 'number' ? student.gradientIndex : 0}`;

  return `
    <div class="card" data-id="${safeId}">
      <div class="card-photo ${gradientClass}">${safeInitials}</div>
      <div class="card-body">
        <div class="cname">${safeName}</div>
        <div class="ctag">${safeTags}</div>
        <div class="ribbon">
          <span class="ribbon-tag mono">ROLL ${safeRoll}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderProfileView(student) {
  const profileContainer = document.querySelector('#profile .profile');
  const profileTag = document.getElementById('profile-roll-tag');

  if (!student) {
    if (profileTag) profileTag.textContent = 'NO PROFILES';
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">👤</div>
          <div class="empty-state-title">No Student Profile Selected</div>
          <div class="empty-state-desc">Classmate profiles will appear here once added. Click "+ Add my profile" in the Students tab to create yours!</div>
        </div>
      `;
    }
    return;
  }

  if (profileTag) profileTag.textContent = `ROLL ${escapeHtml(student.roll)}`;

  const birthdayVal = student.showBirthday && student.birthday 
    ? escapeHtml(student.birthday) 
    : `<span class="field-private">Private / Not shared</span>`;

  const contactVal = student.showContact && student.contact 
    ? escapeHtml(student.contact) 
    : `<span class="field-private">Private / Not shared</span>`;

  const gradientClass = `gradient-${typeof student.gradientIndex === 'number' ? student.gradientIndex : 0}`;

  if (profileContainer) {
    profileContainer.innerHTML = `
      <div>
        <div class="profile-photo ${gradientClass}">
          ${escapeHtml(student.initials || 'ST')}
          <div class="peak-tag">Photo — ${escapeHtml(student.name)}</div>
        </div>
      </div>
      <div class="profile-main">
        <div class="pname display">${escapeHtml(student.name)}</div>
        <div class="prole">${escapeHtml(student.role || `GRADE 10 · SECTION B · ROLL NO. ${student.roll}`)}</div>
        <p class="pbio">${escapeHtml(student.bio)}</p>
        <div class="field-grid">
          <div class="field"><div class="flabel">Favourite subject</div><div class="fval">${escapeHtml(student.favSubject || '—')}</div></div>
          <div class="field"><div class="flabel">Hobbies</div><div class="fval">${escapeHtml(student.hobbies || student.tags || '—')}</div></div>
          <div class="field"><div class="flabel">Favourite quote</div><div class="fval">${escapeHtml(student.favQuote || '—')}</div></div>
          <div class="field"><div class="flabel">Birthday</div><div class="fval">${birthdayVal}</div></div>
          <div class="field"><div class="flabel">Fun fact</div><div class="fval">${escapeHtml(student.funFact || '—')}</div></div>
          <div class="field"><div class="flabel">Contact</div><div class="fval">${contactVal}</div></div>
        </div>
      </div>
    `;
  }
}
