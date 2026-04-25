'use client';

import { useRef, useState, useCallback, DragEvent, ClipboardEvent } from 'react';

export interface ImagePreviewData {
  imageUrl: string | null;  // R2 key (R2 실패 시 null)
  ocrText: string;
  previewUrl: string;       // 로컬 blob URL — 이미지 표시용
}

interface UseQuickImageUploadOptions {
  onPreviewReady: (data: ImagePreviewData) => void;
  onError?: (msg: string) => void;
}

export function useQuickImageUpload({ onPreviewReady, onError }: UseQuickImageUploadOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError?.('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError?.('이미지가 너무 커요. (최대 10MB)');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/quick/image', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        URL.revokeObjectURL(previewUrl);
        throw new Error((err as { error?: string }).error ?? '인식 실패');
      }

      const data = await res.json() as { imageUrl: string | null; ocrText: string };
      onPreviewReady({ ...data, previewUrl });
    } catch (e) {
      onError?.((e as Error).message ?? '오류가 발생했어요.');
    } finally {
      setIsUploading(false);
    }
  }, [onPreviewReady, onError]);

  const triggerUpload = useCallback(() => inputRef.current?.click(), []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  }, [upload]);

  const bindDropZone = {
    onDragOver: (e: DragEvent) => { e.preventDefault(); setIsDragOver(true); },
    onDragLeave: (e: DragEvent) => { e.preventDefault(); setIsDragOver(false); },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
  };

  const bindPaste = {
    onPaste: (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); upload(file); }
    },
  };

  return { inputRef, triggerUpload, handleInputChange, bindDropZone, bindPaste, isUploading, isDragOver };
}
