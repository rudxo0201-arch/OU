import Link from 'next/link';

export const metadata = {
  title: '이용약관 — OU',
};

const sections = [
  {
    title: '제1조 (목적)',
    content: `본 약관은 OU (이하 "서비스")가 제공하는 개인 데이터 우주 플랫폼 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (정의)',
    content: `• "서비스": OU가 제공하는 데이터 수집·구조화·시각화 플랫폼 일체
• "회원": 본 약관에 동의하고 서비스를 이용하는 자
• "DataNode": 대화 데이터를 의미 단위로 구조화한 데이터 단위
• "Orb": 데이터가 입력되는 모든 인터페이스 (채팅, 검색, 음성 등)
• "관리자": OU 팀. 서비스 생태계의 첫 번째 데이터 생산자`,
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    content: `• 본 약관은 서비스 가입 시 동의함으로써 효력이 발생합니다.
• 서비스는 약관을 변경할 수 있으며, 변경 시 서비스 내 공지합니다.
• 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.`,
  },
  {
    title: '제4조 (회원 가입)',
    content: `• 이메일 주소로 가입하며, 본인 인증 후 가입이 완료됩니다.
• 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.`,
  },
  {
    title: '제5조 (데이터 소유권)',
    content: `• 회원이 Orb를 통해 입력하고 생성한 DataNode는 회원 본인의 소유입니다.
• 서비스는 회원의 동의 없이 데이터를 제3자에게 판매하거나 공개하지 않습니다.
• 데이터 기본 가시성은 "나만 보기(private)"입니다. 공개는 회원이 직접 설정합니다.
• 관리자가 생성한 DataNode는 복사 저장이 아닌 참조(user_node_refs) 방식으로 공유됩니다.`,
  },
  {
    title: '제6조 (데이터 보존 및 삭제)',
    content: `• 서비스는 데이터 불삭제 원칙을 적용합니다. 모든 변경은 이벤트로 기록됩니다.
• 회원이 데이터 삭제를 요청하면 30일 이내 비공개 처리하며 삭제 이벤트를 기록합니다.
• 회원 탈퇴 시 개인 식별 정보는 삭제되며, 공개로 설정된 데이터는 별도 처리됩니다.`,
  },
  {
    title: '제7조 (서비스 이용 제한)',
    content: `다음 행위는 금지됩니다.
• 타인의 개인정보 수집·저장·공개
• 서비스 인프라에 과부하를 일으키는 행위
• 불법 콘텐츠 입력·배포
• 서비스의 정상적인 운영을 방해하는 행위

위반 시 서비스 이용이 제한되거나 계정이 해지될 수 있습니다.`,
  },
  {
    title: '제8조 (서비스 변경·중단)',
    content: `• 서비스는 사전 공지 후 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
• 불가피한 사유로 사전 공지 없이 중단될 수 있으며, 이 경우 최대한 신속히 공지합니다.`,
  },
  {
    title: '제9조 (면책)',
    content: `• 서비스는 회원이 입력한 데이터의 정확성·합법성에 대해 책임지지 않습니다.
• LLM(AI) 생성 결과는 참고용이며, 서비스는 그 정확성을 보증하지 않습니다.`,
  },
  {
    title: '제10조 (준거법)',
    content: `본 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 관할 법원은 서울중앙지방법원으로 합니다.`,
  },
];

export default function TermsPage() {
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
          이용약관
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', marginBottom: 48 }}>
          시행일: 2026년 4월 20일
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
          <Link href="/privacy" style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', textDecoration: 'none' }}>
            개인정보처리방침
          </Link>
          <Link href="/" style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', textDecoration: 'none' }}>
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
