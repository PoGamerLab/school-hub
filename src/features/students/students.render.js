import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { renderAvatarHtml, bindAvatarFallbacks } from '../../components/avatar/avatar.js';
import { authService } from '../../core/auth/auth.js';
import { store } from '../../core/store/store.js';

const SAFE_HOUSE_MAP = {
  'Unity': 'house-unity',
  'Faith': 'house-faith',
  'Discipline': 'house-discipline',
  'Tolerance': 'house-tolerance'
};

const HOUSE_ICONS = {
  'Unity': '🔵',
  'Faith': '🔴',
  'Discipline': '🟠',
  'Tolerance': '🟡'
};

function getSafeHouseInfo(rawHouse) {
  const house = SAFE_HOUSE_MAP[rawHouse] ? rawHouse : 'Unity';
  return {
    house,
    houseClass: SAFE_HOUSE_MAP[house],
    houseIcon: HOUSE_ICONS[house] || '🔵'
  };
}

export function renderStudentCard(student) {
  const safeId = escapeAttr(student.id || student.uid);
  const safeName = escapeHtml(student.name);
  const safeInitials = student.initials || 'ST';
  const { house, houseClass, houseIcon } = getSafeHouseInfo(student.house);
  const groupText = escapeHtml(student.group || student.category || 'Science Group');
  const classText = escapeHtml((student.classId || '10-B').toUpperCase());

  const avatarHtml = renderAvatarHtml({
    photoSource: student.photoSource,
    photoThumb: student.photoThumb,
    googlePhotoUrl: student.googlePhotoUrl,
    initials: safeInitials,
    gradientIndex: student.gradientIndex,
    size: 'lg',
    alt: student.name
  });

  return `
    <div class="card" data-id="${safeId}">
      <div class="card-photo">
        ${avatarHtml}
        <span class="card-class-tag">${classText}</span>
      </div>
      <div class="card-body">
        <div class="cname">${safeName}</div>
        <div class="ctag">${groupText} &middot; <span class="house-badge ${houseClass}">${houseIcon} ${escapeHtml(house)}</span></div>
        <div class="ribbon">
          <span class="ribbon-tag mono">${escapeHtml(house.toUpperCase())}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderProfileView(student, currentUid = null) {
  const profileContainer = document.querySelector('#profile .profile');
  const profileTag = document.getElementById('profile-roll-tag');
  const user = authService.getCurrentUser();
  const isAdmin = !!store.get('isAdmin');
  const deletedReason = user?.profileDeletedReason;

  if (student?.isLoading) {
    if (profileTag) profileTag.textContent = 'LOADING';
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon"><div class="app-loading-spinner"></div></div>
          <div class="empty-state-title">Loading Profile…</div>
          <div class="empty-state-desc">Fetching student details from the school database.</div>
        </div>
      `;
    }
    return;
  }

  if (student?.notFound) {
    if (profileTag) profileTag.textContent = 'NOT FOUND';
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-title">Profile Not Found</div>
          <div class="empty-state-desc">This profile does not exist or may have been deleted.</div>
          <div class="profile-create-action">
            <button class="btn btn-outline" id="profile-not-found-back-btn">Back to Class</button>
          </div>
        </div>
      `;
      document.getElementById('profile-not-found-back-btn')?.addEventListener('click', () => {
        router.navigate('class');
      });
    }
    return;
  }

  if (student?.loadFailed) {
    if (profileTag) profileTag.textContent = 'ERROR';
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Could Not Load Profile</div>
          <div class="empty-state-desc">Check your network connection and try again.</div>
          <div class="profile-create-action">
            <button class="btn btn-primary" id="profile-retry-load-btn">Retry</button>
          </div>
        </div>
      `;
      document.getElementById('profile-retry-load-btn')?.addEventListener('click', () => {
        if (typeof window._reloadProfile === 'function') {
          window._reloadProfile(store.get('currentStudentId'));
        }
      });
    }
    return;
  }

  if (!student || student.isUncreated) {
    if (profileTag) profileTag.textContent = 'NO PROFILE';
    const isOwn = user && (!currentUid || currentUid === user.uid);
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div class="empty-state full-width-empty">
          <div class="empty-state-icon">👤</div>
          ${deletedReason && isOwn ? `
            <div class="notice-box notice-warning">
              <strong>⚠️ Notice from Administrator:</strong><br>
              Your previous profile was removed. <em>"${escapeHtml(deletedReason)}"</em><br>
              Please create an updated profile following school guidelines.
            </div>
          ` : ''}
          <div class="empty-state-title">${deletedReason && isOwn ? 'Re-create Your Student Profile' : "You Haven't Created Your Profile Yet"}</div>
          <div class="empty-state-desc">${isOwn ? 'Create your profile now to share your details, house, and interests with the class.' : 'This student has not created their profile yet.'}</div>
          ${isOwn ? `
            <div class="profile-create-action">
              <button class="btn btn-primary" id="create-my-profile-btn">+ Create My Profile</button>
            </div>
          ` : ''}
        </div>
      `;
    }
    return;
  }

  const safeId = escapeAttr(student.id || student.uid);
  const isOwner = user && (student.id === user.uid || student.ownerUid === user.uid);
  const { house, houseClass, houseIcon } = getSafeHouseInfo(student.house);

  if (profileTag) profileTag.textContent = `${house.toUpperCase()} HOUSE`;

  const birthdayVal = student.showBirthday && student.birthday 
    ? escapeHtml(student.birthday) 
    : `<span class="field-private">Private / Not shared</span>`;

  const contactVal = student.showContact && student.contact 
    ? escapeHtml(student.contact) 
    : `<span class="field-private">Private / Not shared</span>`;

  const classText = escapeHtml((student.classId || '10-B').toUpperCase());

  // Check if photo reports exceeded autohide threshold (3+)
  const photoReportsCount = Object.keys(student.photoReports || {}).length;
  const photoHiddenByModeration = photoReportsCount >= 3 && !isAdmin && !isOwner;

  const avatarHtml = renderAvatarHtml({
    photoSource: photoHiddenByModeration ? 'none' : student.photoSource,
    photoThumb: student.photoThumb,
    googlePhotoUrl: student.googlePhotoUrl,
    initials: student.initials || 'ST',
    gradientIndex: student.gradientIndex,
    size: 'xl',
    alt: student.name,
    className: 'profile-avatar-xl'
  });

  if (profileContainer) {
    profileContainer.innerHTML = `
      <div class="profile-photo-col">
        <div class="profile-photo-wrap">
          ${avatarHtml}
          <div class="peak-tag">APSACian &mdash; ${escapeHtml(student.name)}</div>
        </div>
        ${photoHiddenByModeration ? `
          <div class="notice-badge notice-warning">⚠️ Photo under review</div>
        ` : ''}
      </div>
      <div class="profile-main">
        <div class="apsac-badge">Verified APSACian &middot; APSACS Skardu</div>
        <div class="profile-title-bar">
          <div class="pname display">${escapeHtml(student.name)}</div>
          <div class="profile-actions-row">
            ${isOwner ? `
              <button class="btn btn-sm btn-outline" id="edit-my-profile-btn">
                ✏️ Edit Profile
              </button>
              <button class="btn btn-sm btn-outline" id="change-photo-btn">
                📷 Change Photo
              </button>
            ` : ''}
            ${!isOwner && user ? `
              <button class="btn btn-sm btn-ghost" id="report-profile-photo-btn" data-uid="${safeId}" data-class-id="${escapeAttr(st.classId || '')}">
                🚩 Report Photo
              </button>
            ` : ''}
            ${isAdmin ? `
              <button class="btn btn-sm btn-danger" id="admin-delete-student-btn" data-uid="${safeId}">
                🗑️ Delete Profile
              </button>
            ` : ''}
          </div>
        </div>
        <div class="prole">
          <span class="house-badge ${houseClass}">${houseIcon} ${escapeHtml(house)} House</span> &middot;
          <strong>CLASS:</strong> ${classText} &middot;
          <strong>GROUP:</strong> ${escapeHtml(student.group || 'Science Group')}
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

    bindAvatarFallbacks(profileContainer);
  }
}
