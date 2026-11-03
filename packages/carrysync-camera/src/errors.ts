export type CameraErrorCode =
  | 'INSECURE_CONTEXT' | 'CAMERA_UNSUPPORTED' | 'PERMISSION_DENIED'
  | 'CAMERA_UNAVAILABLE' | 'CAMERA_FAILED' | 'DECODER_FAILED'
  | 'MULTIPLE_QR_CODES' | 'IMPORT_BUSY' | 'SCANNER_DISPOSED';

const messages: Record<CameraErrorCode, string> = {
  INSECURE_CONTEXT: 'Camera scanning requires HTTPS or localhost. Use manual text import here.',
  CAMERA_UNSUPPORTED: 'This browser does not provide camera access. Use manual text import.',
  PERMISSION_DENIED: 'Camera permission was denied or blocked. Allow it in browser settings, or use manual text import.',
  CAMERA_UNAVAILABLE: 'No usable camera is available. Close other camera apps, reconnect the device, or use manual text import.',
  CAMERA_FAILED: 'The camera could not start or was interrupted. Retry or use manual text import.',
  DECODER_FAILED: 'The local QR decoder could not load or read frames. Retry or use manual text import.',
  MULTIPLE_QR_CODES: 'More than one QR code is visible. Show only one transfer code and scan again.',
  IMPORT_BUSY: 'Wait for the current import to finish before starting another scan.',
  SCANNER_DISPOSED: 'This scanner has been disposed. Create a new scanner to use the camera.',
};

export class CameraError extends Error {
  constructor(readonly code: CameraErrorCode) {
    super(messages[code]);
    this.name = 'CameraError';
  }
}

export function cameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error;
  const name = error !== null && typeof error === 'object' && 'name' in error ? error.name : '';
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(String(name))) return new CameraError('PERMISSION_DENIED');
  if (['NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError', 'OverconstrainedError'].includes(String(name))) {
    return new CameraError('CAMERA_UNAVAILABLE');
  }
  return new CameraError('CAMERA_FAILED');
}
