import { escapeHtml, escapeAttr } from '../../core/utils/escapeHtml.js';
import { renderStudentCard } from '../students/students.render.js';

export function renderClassesHubCards(classes = [], myClassId = '', studentCounts = {}) {
  if (classes.length === 0) {
    return `
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">🏫</div>
        <div class="empty-state-title">No Active Classes Registered</div>
        <div class="empty-state-desc">The school administrator will create classrooms here soon.</div>
      </div>
    `;
  }

  return classes.map(c => {
    const isMyClass = myClassId && c.id === myClassId;
    const safeId = escapeAttr(c.id);
    const safeName = escapeHtml(c.name || c.id);
    const safeTeacher = escapeHtml(c.classTeacher || 'Teacher unassigned');
    const count = studentCounts[c.id] || 0;

    return `
      <div class="class-card ${isMyClass ? 'is-my-class' : ''}" data-class-id="${safeId}">
        <div class="class-card-top">
          <div class="class-card-name">${safeName}</div>
          <span class="class-card-slug">${escapeHtml(c.id)}</span>
        </div>
        <div class="class-card-teacher">
          <span>👩‍🏫</span> <span>${safeTeacher}</span>
        </div>
        <div class="class-card-footer">
          <div class="class-card-count">
            <span>👥</span> <span>${count} ${count === 1 ? 'Student' : 'Students'}</span>
          </div>
          ${isMyClass ? '<span class="class-my-badge">Your Class</span>' : '<span class="btn btn-sm btn-outline">View Class &rarr;</span>'}
        </div>
      </div>
    `;
  }).join('');
}

export function renderClassDetailBanner(classInfo, isMember) {
  if (!classInfo) return '';
  const safeName = escapeHtml(classInfo.name || classInfo.id);
  const safeTeacher = escapeHtml(classInfo.classTeacher || 'Assigned Educator');
  const avatarText = escapeHtml(
    classInfo.grade ? `${classInfo.grade.replace(/[^0-9]/g, '')}${classInfo.section || ''}` : 'APS'
  );

  return `
    <div class="class-banner">
      <div class="class-banner-content">
        <div class="k">Army Public School &amp; College Skardu &middot; Classroom Hub</div>
        <h3>${safeName}</h3>
        <div class="meta">
          <strong>Class Teacher:</strong> ${safeTeacher} &middot;
          <strong>Affiliation:</strong> FBISE Islamabad
          ${isMember ? '&middot; <span class="class-my-badge">Enrolled Student</span>' : ''}
        </div>
      </div>
      <div class="class-avatar">${avatarText || 'APS'}</div>
    </div>
  `;
}

export function renderClassStudentsGrid(students = []) {
  if (students.length === 0) {
    return `
      <div class="empty-state full-width-empty">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">No Students Enrolled Yet</div>
        <div class="empty-state-desc">New students who verify through the gate will appear here.</div>
      </div>
    `;
  }

  return students.map(s => renderStudentCard(s)).join('');
}
