/**
 * Lightweight MIME type detection using magic numbers.
 * Checks only the first few bytes without building full header strings.
 */
export function detectMimeType(bytes: Uint8Array): string {
  if (!bytes || bytes.length < 4) {
    return 'application/octet-stream';
  }

  // Check first 12 bytes for magic numbers
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  const b3 = bytes[3];

  // JPEG: FF D8 FF
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) {
    return 'image/png';
  }

  // GIF: 47 49 46
  if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) {
    return 'image/gif';
  }

  // WebP: check for "WEBP" at offset 8
  if (bytes.length >= 12 && 
      bytes[8] === 0x57 && bytes[9] === 0x45 && 
      bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }

  // MP4: check for ftyp box
  if (bytes.length >= 8 && 
      bytes[4] === 0x66 && bytes[5] === 0x74 && 
      bytes[6] === 0x79 && bytes[7] === 0x70) {
    return 'video/mp4';
  }

  // WebM: 1A 45 DF A3
  if (b0 === 0x1a && b1 === 0x45 && b2 === 0xdf && b3 === 0xa3) {
    return 'video/webm';
  }

  // PDF: 25 50 44 46
  if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) {
    return 'application/pdf';
  }

  return 'application/octet-stream';
}
