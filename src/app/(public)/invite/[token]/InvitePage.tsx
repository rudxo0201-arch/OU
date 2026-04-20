'use client';

import { useRouter } from 'next/navigation';

const FIELD_LABELS: Record<string, string> = {
  name: '이름', nickname: '닉네임', relationship: '관계', type: '관계 유형',
  contact: '전화번호', email: '이메일', address: '주소', sns: 'SNS',
  birthday: '생일', bloodType: '혈액형', mbti: 'MBTI',
  job: '직업', school: '학교', organization: '소속',
  hobby: '취미', likes: '좋아하는 것', dislikes: '싫어하는 것',
};

interface Props {
  token: string;
  sharedFields: Record<string, string>;
  expired: boolean;
  used: boolean;
}

export default function InvitePage({ token, sharedFields, expired, used }: Props) {
  const router = useRouter();
  const name = sharedFields.name || '누군가';

  if (expired || used) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--ou-bg)' }}>
        <div style={{ fontSize: 14, color: 'var(--ou-text-muted)', textAlign: 'center' }}>
          {used ? '이미 사용된 초대 링크예요.' : '만료된 초대 링크예요.'}<br />
          <span
            onClick={() => router.push('/')}
            style={{ color: 'var(--ou-text-primary)', cursor: 'pointer', textDecoration: 'underline', marginTop: 8, display: 'inline-block' }}
          >
            OU 홈으로
          </span>
        </div>
      </div>
    );
  }

  const fieldEntries = Object.entries(sharedFields).filter(([key]) => key !== 'type');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--ou-bg)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', letterSpacing: 2, marginBottom: 12 }}>OU</div>
          <p style={{ fontSize: 14, color: 'var(--ou-text-secondary)', margin: 0 }}>
            친구가 프로필 카드를 공유했어요
          </p>
        </div>

        {/* 프로필 카드 */}
        <div style={{ background: 'var(--ou-surface)', borderRadius: 16, padding: 24, boxShadow: 'var(--ou-neu-raised)', marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1.5, marginBottom: 16 }}>PROFILE</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ou-text-strong)', marginBottom: 20 }}>{name}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fieldEntries.filter(([key]) => key !== 'name').map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', flexShrink: 0 }}>
                  {FIELD_LABELS[key] || key}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ou-text-primary)', textAlign: 'right', marginLeft: 12 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 16 }}>
            가입하면 이 프로필이 자동으로 등록돼요
          </p>
          <button
            onClick={() => router.push(`/login?next=/home&invite=${token}`)}
            style={{
              width: '100%',
              padding: '14px 0',
              background: 'var(--ou-text-strong)',
              color: 'var(--ou-bg)',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            OU 시작하기
          </button>
          <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 12 }}>
            이미 계정이 있으신가요?{' '}
            <span
              onClick={() => router.push(`/login?next=/home&invite=${token}`)}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              로그인
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
