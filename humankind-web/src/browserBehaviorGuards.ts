const BROWSER_SHORTCUT_CODES = new Set([
  'Equal',
  'F1',
  'F3',
  'F5',
  'F6',
  'F7',
  'F11',
  'F12',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyW',
  'Minus',
  'NumpadAdd',
  'NumpadSubtract',
  'Numpad0',
  'PageDown',
  'PageUp',
  'Tab',
  'Digit0',
  'Delete',
]);

const BROWSER_NAVIGATION_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'BrowserBack',
  'BrowserForward',
  'Home',
]);

const isBrowserShortcut = (event: KeyboardEvent) => {
  if (
    event.code === 'BrowserBack'
    || event.code === 'BrowserForward'
    || event.code === 'ContextMenu'
    || event.code === 'F1'
    || event.code === 'F3'
    || event.code === 'F5'
    || event.code === 'F6'
    || event.code === 'F7'
    || event.code === 'F11'
    || event.code === 'F12'
    || (event.shiftKey && event.code === 'F10')
  ) {
    return true;
  }

  if (event.altKey && BROWSER_NAVIGATION_CODES.has(event.code)) {
    return true;
  }

  if (!event.ctrlKey && !event.metaKey) {
    return false;
  }

  return BROWSER_SHORTCUT_CODES.has(event.code);
};

export function installBrowserBehaviorGuards() {
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  }, { capture: true });

  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof Element && event.target.closest('img')) {
      event.preventDefault();
    }
  }, { capture: true });

  window.addEventListener('keydown', (event) => {
    if (!isBrowserShortcut(event)) return;
    event.preventDefault();
  }, { capture: true });

  const blockBrowserMouseButtons = (event: MouseEvent) => {
    if (event.button !== 1 && event.button !== 3 && event.button !== 4) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener('mousedown', blockBrowserMouseButtons, { capture: true });
  window.addEventListener('auxclick', blockBrowserMouseButtons, { capture: true });

  window.addEventListener('wheel', (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
  }, { capture: true, passive: false });
}
