import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 — OU',
};

const sections = [
  {
    title: '1. 수집하는 개인정보 항목',
    content: `OU는 서비스 제공을 위해 다음 정보를 수집합니다.

• 이메일 주소 (회원 가입 및 인증)
• 대화 데이터 (Orb에 입력한 텍스트, 파일)
• YouTube 구독 채널 목록 (YouTube 연동 시, 채널 ID만 수집)
• 서비스 이용 기록 (접속 일시, 기능 사용 내역)`,
  },
  {
    title: '2. 개인정보 수집·이용 목적',
    content: `• 서비스 제공: 대화 데이터를 DataNode로 구조화하여 개인 지식 그래프 생성
• 회원 식별 및 인증
• YouTube 피드 크롤링 (연동한 구독 채널의 최신 영상 표시)
• 서비스 품질 개선 및 오류 분석`,
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    content: `• 회원 탈퇴 시까지 보유합니다.
• 탈퇴 요청 시 30일 이내 파기합니다.
• 단, 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
• OU는 데이터 불삭제 원칙을 적용합니다. 삭제 요청 시 데이터는 비공개 처리되며, 삭제 이벤트로 기록됩니다.`,
  },
  {
    title: '4. 개인정보 제3자 제공',
    content: `OU는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 개인정보를 광고주 등 제3자에게 직접 판매하지 않습니다.

다만, 아래의 경우 예외적으로 처리됩니다.
• 이용자가 직접 동의한 경우
• 법령에 의거한 경우`,
  },
  {
    title: '5. 외부 서비스 이용 고지',
    content: `OU는 서비스 제공을 위해 다음 외부 서비스를 사용합니다.

• Anthropic (Claude): 대화 데이터 처리 및 DataNode 생성. 입력 데이터는 Anthropic의 모델 학습에 사용되지 않습니다.
• OpenAI: LLM 폴백 용도. 동일하게 학습 미사용.
• Google (YouTube Data API): YouTube 연동 시 구독 채널 목록 조회.
• Cloudflare R2: 파일(이미지, 문서) 저장.
• Supabase: 데이터베이스 및 인증.
• Upstash Redis: 캐시 데이터 저장.`,
  },
  {
    title: '6. 이용자의 권리',
    content: `이용자는 언제든지 다음을 요청할 수 있습니다.

• 개인정보 열람
• 데이터 내보내기 (.ou 파일 형식)
• 개인정보 수정
• 서비스 탈퇴 및 개인정보 삭제

요청은 아래 연락처로 이메일 주세요.`,
  },
  {
    title: '7. 개인정보 보호책임자',
    content: `• 이메일: rudxo0201@gmail.com
• 운영사: OU Team`,
  },
  {
    title: '8. 개정 이력',
    content: `• 2026년 4월 20일: 최초 제정`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ou-bg)', color: 'var(--ou-text-body)' }}>
      {/* Nav */}
      <nav style={{
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--ou-border-faint)',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 15, fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--ou-text-bright)',
          textDecoration: 'none',
        }}>
          OU
        </Link>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 120px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--ou-text-bright)', marginBottom: 8 }}>
          개인정보처리방침
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', marginBottom: 48 }}>
          시행일: 2026년 4월 20일
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ou-text-body)', marginBottom: 48 }}>
          OU (이하 "서비스")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
          본 방침은 서비스가 수집하는 개인정보의 항목, 이용 목적, 보유 기간 및 이용자의 권리에 대해 안내합니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {sections.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ou-text-bright)', marginBottom: 12 }}>
                {s.title}
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ou-text-body)', whiteSpace: 'pre-line', margin: 0 }}>
                {s.content}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid var(--ou-border-faint)', display: 'flex', gap: 24 }}>
          <Link href="/terms" style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', textDecoration: 'none' }}>
            이용약관
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', textDecoration: 'none' }}>
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
