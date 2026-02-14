/**
 * Trigger a download from an object URL with an optional filename.
 */
export function downloadFromUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Trigger a download directly from bytes by creating a temporary blob URL.
 * This is used as a fallback when object URL is not available.
 */
export function downloadFromBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType: string = 'application/octet-stream'
) {
  try {
    // Create a new Uint8Array to ensure proper ArrayBuffer type
    const normalizedBytes = new Uint8Array(bytes);
    const blob = new Blob([normalizedBytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    downloadFromUrl(url, filename);
    // Clean up the temporary URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to download from bytes:', error);
    throw error;
  }
}

/**
 * Derive a file extension from a MIME type.
 * Returns 'bin' as a stable default for unknown types.
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/octet-stream': 'bin',
  };
  return mimeMap[mimeType] || 'bin';
}
