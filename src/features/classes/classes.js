import { store } from '../../core/store/store.js';
import { renderClassBanner } from './classes.render.js';

export function initClasses() {
  const container = document.getElementById('class-banner-container');
  if (!container) return;

  function render() {
    const classInfo = store.get('classInfo');
    container.innerHTML = renderClassBanner(classInfo);
  }

  store.subscribe('classInfo', () => {
    render();
  });

  render();
}
