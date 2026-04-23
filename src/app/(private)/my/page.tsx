// LEGACY(2026-04-24): 구 홈(위젯 바탕화면) 컨셉. /home 통합 완료. Phase 3에서 파일 삭제.
// DATA: localStorage="ou-widget-layout" — widgetStore 공유로 이관 완료.
import { redirect } from 'next/navigation';

export default function MyPage() {
  redirect('/home');
}
