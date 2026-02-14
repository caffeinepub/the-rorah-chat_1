import { useEffect, useRef, useState } from 'react';
import { getMediaFingerprint } from '../utils/mediaFingerprint';

// Global cache to reuse URLs across components when media is identical
const urlCache = new Map<string, { url: string; refCount: number }>();

/**
 * Hook that manages object URLs for message attachments with proper cleanup
 * and caching to prevent memory leaks and unnecessary re-creation.
 * Returns null if media is invalid or cannot be converted to an object URL.
 */
export function useAttachmentObjectUrl(
  media: Uint8Array | undefined,
  mimeType: string
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const fingerprintRef = useRef<string>('');
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!media || media.length === 0) {
      // Clean up if media was removed
      if (currentUrlRef.current) {
        const oldFingerprint = fingerprintRef.current;
        const cached = urlCache.get(oldFingerprint);
        if (cached) {
          cached.refCount--;
          if (cached.refCount <= 0) {
            URL.revokeObjectURL(cached.url);
            urlCache.delete(oldFingerprint);
          }
        }
        currentUrlRef.current = null;
        fingerprintRef.current = '';
      }
      setUrl(null);
      return;
    }

    const fingerprint = getMediaFingerprint(media);
    
    // If fingerprint hasn't changed, keep the current URL
    if (fingerprint === fingerprintRef.current && currentUrlRef.current) {
      return;
    }

    // Clean up old URL if fingerprint changed
    if (currentUrlRef.current && fingerprintRef.current) {
      const oldCached = urlCache.get(fingerprintRef.current);
      if (oldCached) {
        oldCached.refCount--;
        if (oldCached.refCount <= 0) {
          URL.revokeObjectURL(oldCached.url);
          urlCache.delete(fingerprintRef.current);
        }
      }
    }

    // Check cache for existing URL
    let cached = urlCache.get(fingerprint);
    if (cached) {
      cached.refCount++;
      currentUrlRef.current = cached.url;
      fingerprintRef.current = fingerprint;
      setUrl(cached.url);
      return;
    }

    // Create new URL and cache it with error handling
    try {
      // Create a proper ArrayBuffer slice to ensure type compatibility
      const buffer = media.buffer as ArrayBuffer;
      const slice = buffer.slice(media.byteOffset, media.byteOffset + media.byteLength);
      const blob = new Blob([slice], { type: mimeType });
      const newUrl = URL.createObjectURL(blob);
      urlCache.set(fingerprint, { url: newUrl, refCount: 1 });
      currentUrlRef.current = newUrl;
      fingerprintRef.current = fingerprint;
      setUrl(newUrl);
    } catch (error) {
      console.error('Failed to create object URL for attachment:', error);
      setUrl(null);
      return;
    }

    // Cleanup on unmount
    return () => {
      const cached = urlCache.get(fingerprint);
      if (cached) {
        cached.refCount--;
        if (cached.refCount <= 0) {
          URL.revokeObjectURL(cached.url);
          urlCache.delete(fingerprint);
        }
      }
    };
  }, [media, mimeType]);

  return url;
}
