// 이미지 파이프라인은 api/quick/image/route.ts에서 직접 처리합니다.
// OCR 텍스트 → saveMessageAsync → 기존 파이프라인이 도메인 분류/추출
// 이 파일은 타입 export용으로만 남깁니다.

export type ImageType = 'image';
