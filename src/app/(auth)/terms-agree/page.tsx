'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OuAuthLayout, OuCard, OuCheckbox, OuButton } from '@/components/ds';

const TERMS_TEXT = `OU 서비스를 이용해 주셔서 감사합니다. 본 서비스는 사용자의 대화 데이터를 구조화하여 개인화된 지식 그래프를 생성합니다. 수집된 데이터는 서비스 개선 목적으로만 사용됩니다.

개인정보는 암호화하여 안전하게 저장되며, 사용자의 동의 없이 제3자에게 제공되지 않습니다.

서비스 이용 중 생성된 DataNode는 사용자 본인의 소유이며, 언제든지 내보내기 또는 삭제를 요청할 수 있습니다. OU는 사용자 데이터를 학습 목적으로 사용하지 않습니다.`;

export default function TermsAgreePage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <OuAuthLayout title="이용약관" maxWidth={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <OuCard
          variant="pressed"
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--ou-text-body)',
            whiteSpace: 'pre-line',
          }}
        >
          {TERMS_TEXT}
        </OuCard>

        <OuCheckbox
          checked={agreed}
          onChange={setAgreed}
          label="위 약관에 동의합니다"
        />

        <OuButton
          variant={agreed ? 'default' : 'ghost'}
          fullWidth
          onClick={() => agreed && router.push('/login')}
          style={{ opacity: agreed ? 1 : 0.5 }}
        >
          동의하고 계속하기
        </OuButton>
      </div>
    </OuAuthLayout>
  );
}
