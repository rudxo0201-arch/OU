import { Center, Stack, Text, Button } from '@mantine/core';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Center h="100vh" px="xl">
      <Stack align="center" gap="lg" maw={400}>
        <MagnifyingGlass size={48} weight="light" color="var(--mantine-color-gray-5)" />
        <Text fw={600} fz="lg" ta="center">
          페이지를 찾을 수 없어요
        </Text>
        <Text fz="sm" c="dimmed" ta="center">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </Text>
        <Button variant="light" color="gray" component={Link} href="/">
          홈으로 돌아가기
        </Button>
      </Stack>
    </Center>
  );
}
