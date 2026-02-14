/**
 * Generate a lightweight fingerprint for media bytes to detect changes
 * without storing or comparing the entire byte array on every render.
 */
export function getMediaFingerprint(media: Uint8Array | undefined): string {
  if (!media || media.length === 0) return '';
  
  // Use length + first/last few bytes as a quick fingerprint
  const len = media.length;
  
  // Avoid creating intermediate arrays - just build string directly
  const start = Math.min(8, len);
  const endStart = Math.max(0, len - 8);
  
  let fingerprint = `${len}`;
  
  // Add first bytes
  for (let i = 0; i < start; i++) {
    fingerprint += `-${media[i]}`;
  }
  
  // Add last bytes if different from start
  if (endStart > start) {
    for (let i = endStart; i < len; i++) {
      fingerprint += `-${media[i]}`;
    }
  }
  
  return fingerprint;
}
