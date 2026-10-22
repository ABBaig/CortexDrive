use client

import { useState, useCallback, ChangeEvent } from 'react';

export default function useSelfieCapture() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setPreview(null);
  }, []);

  return { file, preview, onChange, clear, setFile } as const;
}
