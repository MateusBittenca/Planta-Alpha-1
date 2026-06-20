export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

function key(plantaId: string) {
  return `sgm-camera-${plantaId}`;
}

export function loadCameraState(plantaId: string): CameraState | null {
  try {
    const raw = sessionStorage.getItem(key(plantaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CameraState;
    if (!parsed.position?.length || !parsed.target?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCameraState(plantaId: string, state: CameraState) {
  try {
    sessionStorage.setItem(key(plantaId), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function clearCameraState(plantaId: string) {
  try {
    sessionStorage.removeItem(key(plantaId));
  } catch {
    /* ignore */
  }
}
