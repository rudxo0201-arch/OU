'use client';

import { Stack, Group, Text, Table, Badge, Paper } from '@mantine/core';
import { VIEW_REGISTRY, DOMAIN_VIEW_MAP } from '@/components/views/registry';

export function ViewSettings() {
  const registeredViews = Object.entries(VIEW_REGISTRY);
  const domainMaps = Object.entries(DOMAIN_VIEW_MAP);

  return (
    <Stack gap="md">
      {/* View Registry */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">등록된 뷰 타입</Text>
        <Table fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>뷰 타입 ID</Table.Th>
              <Table.Th>상태</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {registeredViews.map(([key]) => (
              <Table.Tr key={key}>
                <Table.Td>
                  <Text fz="xs" ff="monospace">{key}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color="dark" size="xs">활성</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Domain → View Mapping */}
      <Paper p="md">
        <Text fw={600} fz="sm" mb="md">도메인 → 기본 뷰 매핑</Text>
        <Table fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>도메인</Table.Th>
              <Table.Th>기본 뷰</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {domainMaps.map(([domain, view]) => (
              <Table.Tr key={domain}>
                <Table.Td>
                  <Badge variant="light" color="gray" size="xs">{domain}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text fz="xs" ff="monospace">{view}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Text fz="xs" c="dimmed">
        뷰 레지스트리는 코드에서 관리됩니다. 새 뷰를 추가하려면 registry.ts에 등록하세요.
      </Text>
    </Stack>
  );
}
