'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

/**
 * Captures a selfie from a plain file input.
 * preview is an object URL for display ONLY (never sent to the server).
 * Object URLs are revoked on replace and unmount so blob URLs never leak.
 */
export default function useSelfieCapture() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, []);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    // Revoke any previous object URL before creating a new one
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      prevUrl.current = url;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const clear = useCallback(() => {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    setFile(null);
    setPreview(null);
  }, []);

  return { file, setFile, preview, onChange, clear } as const;
}