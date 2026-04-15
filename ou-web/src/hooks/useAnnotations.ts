'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Annotation {
  id: string;
  user_id: string;
  node_id: string;
  section_id: string | null;
  type: 'highlight' | 'note' | 'bookmark' | 'canvas';
  selected_text: string | null;
  note_text: string | null;
  color: string;
  position: any;
  importance: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  annotation_sentence_targets?: { sentence_id: string }[];
}

interface UseAnnotationsReturn {
  annotations: Annotation[];
  loading: boolean;
  createAnnotation: (input: CreateAnnotationInput) => Promise<Annotation | null>;
  updateAnnotation: (id: string, updates: UpdateAnnotationInput) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

interface CreateAnnotationInput {
  type: 'highlight' | 'note' | 'bookmark' | 'canvas';
  selected_text?: string;
  note_text?: string;
  color?: string;
  position?: any;
  section_id?: string;
  importance?: number;
  sentence_ids?: string[];
}

interface UpdateAnnotationInput {
  note_text?: string;
  color?: string;
  importance?: number;
}

export function useAnnotations(nodeId: string | undefined): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const nodeIdRef = useRef(nodeId);
  nodeIdRef.current = nodeId;

  const fetchAnnotations = useCallback(async () => {
    if (!nodeIdRef.current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${nodeIdRef.current}/annotations`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data.annotations ?? []);
      }
    } catch (e) {
      console.error('[useAnnotations] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnotations();
  }, [nodeId, fetchAnnotations]);

  const createAnnotation = useCallback(async (input: CreateAnnotationInput): Promise<Annotation | null> => {
    if (!nodeIdRef.current) return null;

    // 낙관적 업데이트용 임시 ID
    const tempId = crypto.randomUUID();
    const optimistic: Annotation = {
      id: tempId,
      user_id: '',
      node_id: nodeIdRef.current,
      section_id: input.section_id ?? null,
      type: input.type,
      selected_text: input.selected_text ?? null,
      note_text: input.note_text ?? null,
      color: input.color ?? 'gray-3',
      position: input.position ?? null,
      importance: input.importance ?? 0,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      annotation_sentence_targets: (input.sentence_ids ?? []).map(sid => ({ sentence_id: sid })),
    };

    setAnnotations(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/nodes/${nodeIdRef.current}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.ok) {
        const data = await res.json();
        // 임시 → 실제 데이터로 교체
        setAnnotations(prev => prev.map(a => a.id === tempId ? { ...optimistic, ...data.annotation } : a));
        return data.annotation;
      } else {
        // 실패 시 롤백
        setAnnotations(prev => prev.filter(a => a.id !== tempId));
        return null;
      }
    } catch (e) {
      console.error('[useAnnotations] Create error:', e);
      setAnnotations(prev => prev.filter(a => a.id !== tempId));
      return null;
    }
  }, []);

  const updateAnnotation = useCallback(async (id: string, updates: UpdateAnnotationInput): Promise<boolean> => {
    // 낙관적 업데이트
    setAnnotations(prev => prev.map(a =>
      a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
    ));

    try {
      const res = await fetch(`/api/annotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        // 롤백: refetch
        await fetchAnnotations();
        return false;
      }
      return true;
    } catch (e) {
      console.error('[useAnnotations] Update error:', e);
      await fetchAnnotations();
      return false;
    }
  }, [fetchAnnotations]);

  const deleteAnnotation = useCallback(async (id: string): Promise<boolean> => {
    // 낙관적 제거
    const prev = annotations;
    setAnnotations(a => a.filter(ann => ann.id !== id));

    try {
      const res = await fetch(`/api/annotations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setAnnotations(prev);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[useAnnotations] Delete error:', e);
      setAnnotations(prev);
      return false;
    }
  }, [annotations]);

  return {
    annotations,
    loading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch: fetchAnnotations,
  };
}
