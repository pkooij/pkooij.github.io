const _isMobile = window.matchMedia(
  "(hover: none) and (pointer: coarse)"
).matches;
export function isTouch() {
  return _isMobile;
}

const _canHover = window.matchMedia("(hover: hover)").matches;
export function canHover() {
  return _canHover;
}

export function isNarrowScreen() {
  return document.body.clientWidth < 768;
}

export function localize(key, ...args) {
  return $.i18n(key, ...args);
}
