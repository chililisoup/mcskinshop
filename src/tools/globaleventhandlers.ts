import EditManager from '@tools/editman';
import SessionManager from '@tools/sessionman';

export function init() {
  document.addEventListener('keydown', onKeyDown);
}

function onKeyDown(e: KeyboardEvent) {
  if (!e.ctrlKey) return;

  if (
    document.hasFocus() &&
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.type !== 'checkbox' &&
    document.activeElement.type !== 'range'
  )
    return;

  if (e.key === 'z') EditManager.requestUndo();
  else if (e.key === 'Z' || e.key === 'y') EditManager.requestRedo();
  else if (e.key === 's') {
    SessionManager.saveSession();
    e.preventDefault();
    e.stopPropagation();
  }
}
