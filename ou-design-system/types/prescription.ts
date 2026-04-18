export interface Prescription {
  id: string;
  nameKorean: string;
  nameHanja: string;
  categoryMajor: string;
  herbs: Array<{
    bonchoId: string;
    role: '군' | '신' | '좌우';
  }>;
}
