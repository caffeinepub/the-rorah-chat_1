/**
 * Simple memoization cache for attachment metadata keyed by fingerprint.
 */
const attachmentCache = new Map<string, { mimeType: string }>();

export function getCachedAttachmentMetadata(
  fingerprint: string,
  compute: () => { mimeType: string }
): { mimeType: string } {
  if (!fingerprint) {
    return compute();
  }

  const cached = attachmentCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  const result = compute();
  attachmentCache.set(fingerprint, result);

  // Limit cache size to prevent memory leaks
  if (attachmentCache.size > 500) {
    const firstKey = attachmentCache.keys().next().value;
    if (firstKey) {
      attachmentCache.delete(firstKey);
    }
  }

  return result;
}
