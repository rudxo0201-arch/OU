import { create } from 'zustand';

export interface CareSubject {
  id: string;
  subject_type: string;
  name: string;
  display_order: number;
  birthday: string | null;
}

interface CareSubjectsState {
  subjects: CareSubject[];
  activeSubjectName: string | null;
  loaded: boolean;
  setSubjects: (subjects: CareSubject[]) => void;
  addSubject: (subject: CareSubject) => void;
  setActiveSubjectName: (name: string | null) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useCareSubjectsStore = create<CareSubjectsState>((set) => ({
  subjects: [],
  activeSubjectName: null,
  loaded: false,
  setSubjects: (subjects) => set({ subjects }),
  addSubject: (subject) => set(s => ({ subjects: [...s.subjects, subject] })),
  setActiveSubjectName: (activeSubjectName) => set({ activeSubjectName }),
  setLoaded: (loaded) => set({ loaded }),
}));
