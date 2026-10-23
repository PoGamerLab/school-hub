import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderStudentCard(student) {
  const safeId = escapeAttr(student.id || student.uid);
  const safeName = escapeHtml(student.name);
  const safeRoll = escapeHtml(student.roll);
  const safeInitials = escapeHtml(student.initials || 'ST');
  const gradientClass = `gradient-${typeof student.gradientIndex === 'number' ? student.gradientIndex : 0}`;
  const house = student.house || 'Unity';
  const houseClass = `house-${house.toLowerCase()}`;
  const houseIcons = { Unity: '🔴', Faith: '🟡', Discipline: '🔵', Tolerance: '🟢' };
  const houseIcon = houseIcons[house] || '🔴';
  const groupText = escapeHtml(student.group || student.category || 'Science');
  const classText = escapeHtml((student.classId || '10-B').toUpperCase());

  return `
    <div class="card" data-id="${safeId}">
      <div class="card-photo ${gradientClass}">
        ${safeInitials}
        <span class="card-class-tag">${classText}</span>
      </div>
      <div class="card-body">
        <div class="cname">${safeName}</div>
        <div class="ctag">${groupText} &middot; <span class="house-badge ${houseClass}">${houseIcon} ${escapeHtml(house)}</span></div>
        <div class="ribbon">
          <span class="ribbon-tag mono">ROLL ${safeRoll}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderProfileView(student, currentUid = null) {
  const profileContainer = document.querySelector('#profile .profile');
  const profileTag = document.getElementById('profile-roll-tag');

  if (!student) {
    if (profileTag) profileTag.textContent = 'NO PROFILES';
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">👤</div>
          <div class="empty-state-title">No Student Profile Selected</div>
          <div class="empty-state-desc">Classmate profiles will appear here once registered.</div>
        </div>
      `;
    }
    return;
  }

  const isOwner = currentUid && (student.id === currentUid || student.ownerUid === currentUid);

  if (profileTag) profileTag.textContent = `ROLL ${escapeHtml(student.roll)}`;

  const birthdayVal = student.showBirthday && student.birthday 
    ? escapeHtml(student.birthday) 
    : `<span class="field-private">Private / Not shared</span>`;

  const contactVal = student.showContact && student.contact 
    ? escapeHtml(student.contact) 
    : `<span class="field-private">Private / Not shared</span>`;

  const gradientClass = `gradient-${typeof student.gradientIndex === 'number' ? student.gradientIndex : 0}`;
  const house = student.house || 'Unity';
  const houseClass = `house-${house.toLowerCase()}`;
  const houseIcons = { Unity: '🔴', Faith: '🟡', Discipline: '🔵', Tolerance: '🟢' };
  const houseIcon = houseIcons[house] || '🔴';
  const classText = escapeHtml((student.classId || '10-B').toUpperCase());

  if (profileContainer) {
    profileContainer.innerHTML = `
      <div>
        <div class="profile-photo ${gradientClass}">
          ${escapeHtml(student.initials || 'ST')}
          <div class="peak-tag">APSACian &mdash; ${escapeHtml(student.name)}</div>
        </div>
      </div>
      <div class="profile-main">
        <div class="apsac-badge">Verified APSACian &middot; APSACS Skardu</div>
        <div class="profile-title-bar">
          <div class="pname display">${escapeHtml(student.name)}</div>
          ${isOwner ? `
            <button class="btn btn-sm btn-outline" id="edit-my-profile-btn">
              ✏️ Edit Profile
            </button>
          ` : ''}
        </div>
        <div class="prole">
          <span class="house-badge ${houseClass}">${houseIcon} ${escapeHtml(house)} House</span> &middot;
          <strong>CLASS:</strong> ${classText} &middot;
          <strong>ROLL NO:</strong> ${escapeHtml(student.roll)}
        </div>
        <p class="pbio">${escapeHtml(student.bio)}</p>
        <div class="field-grid">
          <div class="field"><div class="flabel">Class &amp; Section</div><div class="fval">Grade ${classText} (FBISE Islamabad)</div></div>
          <div class="field"><div class="flabel">APSACS House</div><div class="fval">${houseIcon} ${escapeHtml(house)} House</div></div>
          <div class="field"><div class="flabel">Academic Group / Discipline</div><div class="fval">${escapeHtml(student.group || 'Science Group')}</div></div>
          <div class="field"><div class="flabel">Special Interest / Activity</div><div class="fval">${escapeHtml(student.category || 'Sports')}</div></div>
          <div class="field"><div class="flabel">Favourite Subject</div><div class="fval">${escapeHtml(student.favSubject || '—')}</div></div>
          <div class="field"><div class="flabel">Hobbies / Hype Tags</div><div class="fval">${escapeHtml(student.hobbies || student.tags || '—')}</div></div>
          <div class="field"><div class="flabel">Favourite Quote</div><div class="fval">${escapeHtml(student.favQuote || '—')}</div></div>
          <div class="field"><div class="flabel">Fun Fact</div><div class="fval">${escapeHtml(student.funFact || '—')}</div></div>
          <div class="field"><div class="flabel">Birthday</div><div class="fval">${birthdayVal}</div></div>
          <div class="field"><div class="flabel">Contact Handle</div><div class="fval">${contactVal}</div></div>
        </div>
      </div>
    `;
  }
}
