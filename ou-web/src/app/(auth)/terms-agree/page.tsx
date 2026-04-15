'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stack, Title, Text, Paper, Center, Checkbox, Button } from '@mantine/core';

export default function TermsAgreePage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  return (
    <Center h="100dvh">
      <Paper w={480} p="xl" radius="lg">
        <Stack gap="md">
          <Title order={2}>이용약관</Title>
          <Text c="dimmed" fz="sm">
            OU 서비스를 이용해 주셔서 감사합니다. 본 서비스는 사용자의 대화 데이터를 구조화하여
            개인화된 지식 그래프를 생성합니다. 수집된 데이터는 서비스 개선 목적으로만 사용됩니다.
          </Text>
          <Text c="dimmed" fz="sm">
            개인정보는 암호화하여 안전하게 저장되며, 사용자의 동의 없이 제3자에게 제공되지 않습니다.
          </Text>

          <Checkbox
            label="위 약관에 동의합니다"
            checked={agreed}
            onChange={(e) => setAgreed(e.currentTarget.checked)}
          />

          <Button
            fullWidth
            color="dark"
            disabled={!agreed}
            onClick={() => router.push('/login')}
          >
            동의하고 계속하기
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
