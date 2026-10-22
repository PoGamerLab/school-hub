import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';

export function renderStudentCard(student) {
  const safeId = escapeAttr(student.id);
  const safeName = escapeHtml(student.name);
  const safeTags = escapeHtml(student.tags);
  const safeRoll = escapeHtml(student.roll);
  const safeInitials = escapeHtml(student.initials);
  const safeGradient = student.gradient ? escapeAttr(student.gradient) : 'linear-gradient(150deg, #1E6B4C, #0E271A)';

  return `
    <div class="card" data-id="${safeId}">
      <div class="card-photo" style="background:${safeGradient};">${safeInitials}</div>
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
  if (!student) return;

  const profileTag = document.getElementById('profile-roll-tag');
  const profilePhoto = document.querySelector('#profile .profile-photo');
  const pname = document.querySelector('#profile .pname');
  const prole = document.querySelector('#profile .prole');
  const pbio = document.querySelector('#profile .pbio');
  const fieldGrid = document.querySelector('#profile .field-grid');

  if (profileTag) profileTag.textContent = `ROLL ${student.roll}`;
  if (profilePhoto) {
    profilePhoto.style.background = student.gradient || 'linear-gradient(160deg, var(--emerald), var(--pine-deep))';
    profilePhoto.innerHTML = `
      ${escapeHtml(student.initials)}
      <div class="peak-tag">Photo — ${escapeHtml(student.name)}</div>
    `;
  }
  if (pname) pname.textContent = student.name;
  if (prole) prole.textContent = student.role;
  if (pbio) pbio.textContent = student.bio;

  if (fieldGrid) {
    const birthdayVal = student.showBirthday && student.birthday 
      ? escapeHtml(student.birthday) 
      : `<span class="field-private">Private / Not shared</span>`;

    const contactVal = student.showContact && student.contact 
      ? escapeHtml(student.contact) 
      : `<span class="field-private">Private / Not shared</span>`;

    fieldGrid.innerHTML = `
      <div class="field"><div class="flabel">Favourite subject</div><div class="fval">${escapeHtml(student.favSubject || '—')}</div></div>
      <div class="field"><div class="flabel">Hobbies</div><div class="fval">${escapeHtml(student.hobbies || student.tags || '—')}</div></div>
      <div class="field"><div class="flabel">Favourite quote</div><div class="fval">${escapeHtml(student.favQuote || '—')}</div></div>
      <div class="field"><div class="flabel">Birthday</div><div class="fval">${birthdayVal}</div></div>
      <div class="field"><div class="flabel">Fun fact</div><div class="fval">${escapeHtml(student.funFact || '—')}</div></div>
      <div class="field"><div class="flabel">Contact</div><div class="fval">${contactVal}</div></div>
    `;
  }
}
