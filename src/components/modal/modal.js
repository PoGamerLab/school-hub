export function initModal(modalId, openBtnId, closeBtnId) {
  const modal = document.getElementById(modalId);
  if (!modal) return null;

  const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
  const closeBtn = closeBtnId ? document.getElementById(closeBtnId) : modal.querySelector('.modal-close');

  const open = () => modal.classList.add('active');
  const close = () => modal.classList.remove('active');

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    });
  }

  // Click backdrop to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });

  // ESC to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      close();
    }
  });

  return { open, close, modal };
}
