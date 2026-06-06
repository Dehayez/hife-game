/**
 * CameraViewMode.js
 *
 * Configuration for camera view mode (third-person vs first-person).
 */

import { getCameraViewMode as readStored, setCameraViewMode as writeStored } from '../../utils/StorageUtils.js';

export const VIEW_MODE = {
  THIRD_PERSON: 'third-person',
  FIRST_PERSON: 'first-person'
};

export const DEFAULT_VIEW_MODE = VIEW_MODE.THIRD_PERSON;

let _cachedMode = null;

export function getCameraViewMode() {
  if (_cachedMode === null) {
    _cachedMode = readStored();
  }
  return _cachedMode;
}

export function setCameraViewMode(mode) {
  if (mode !== VIEW_MODE.THIRD_PERSON && mode !== VIEW_MODE.FIRST_PERSON) {
    console.warn(`Invalid view mode: ${mode}. Ignoring.`);
    return;
  }
  _cachedMode = mode;
  writeStored(mode);
}

export function isFirstPerson() {
  return getCameraViewMode() === VIEW_MODE.FIRST_PERSON;
}
