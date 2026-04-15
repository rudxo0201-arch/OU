'use client';

import { useState, useRef } from 'react';
import {
  ActionIcon, Popover, Stack, Text, Group, Box,
  UnstyledButton, ScrollArea, Indicator,
} from '@mantine/core';
import { Bell, Target, ChatCircle, UserPlus, UsersThree, FileMagnifyingGlass } from '@phosphor-icons/react';
import { useNotifications, NotificationItem } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

const TYPE_ICONS: Record<NotificationItem['type'], React.ElementType> = {
  accuracy: Target,
  message: ChatCircle,
  follower: UserPlus,
  group_invite: UsersThree,
  pdf_review: FileMagnifyingGlass,
};

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const [opened, setOpened] = useState(false);
  const router = useRouter();

  const handleClick = (href: string) => {
    setOpened(false);
    router.push(href);
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="right-start"
      width={320}
      shadow="md"
      radius="md"
    >
      <Popover.Target>
        <Indicator
          size={14}
          label={unreadCount > 9 ? '9+' : String(unreadCount)}
          disabled={unreadCount === 0}
          color="dark"
          styles={{
            indicator: {
              fontSize: 9,
              fontWeight: 700,
              padding: '0 4px',
              minWidth: 16,
              height: 16,
            },
          }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setOpened(o => !o)}
            size="lg"
          >
            <Bell size={20} weight={opened ? 'fill' : 'light'} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown
        p={0}
        style={{ border: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Box px="md" py="sm" style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
          <Text fw={600} fz="sm">알림</Text>
        </Box>

        <ScrollArea.Autosize mah={360}>
          {notifications.length === 0 ? (
            <Box py="xl" px="md">
              <Text fz="sm" c="dimmed" ta="center">
                새로운 알림이 없어요
              </Text>
            </Box>
          ) : (
            <Stack gap={0}>
              {notifications.map(item => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => handleClick(item.href)}
                    px="md"
                    py="sm"
                    style={{
                      borderBottom: '0.5px solid var(--mantine-color-default-border)',
                    }}
                  >
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <Box mt={2}>
                        <Icon size={18} weight="light" />
                      </Box>
                      <Box flex={1} style={{ overflow: 'hidden' }}>
                        <Text fz="xs" fw={500}>{item.title}</Text>
                        <Text fz="xs" c="dimmed" lineClamp={1}>{item.description}</Text>
                      </Box>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
