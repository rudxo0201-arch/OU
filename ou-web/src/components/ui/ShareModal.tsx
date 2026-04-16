'use client';

import { useState, useEffect } from 'react';
import {
  Modal, Text, TextInput, Group, Stack, ActionIcon, Box,
  SegmentedControl, Tooltip, Image,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Copy, Check, Lock, Link as LinkIcon, Globe } from '@phosphor-icons/react';
import type { Visibility } from '@/types';

interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  nodeId: string;
  title?: string;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ElementType; tip: string }[] = [
  { value: 'private', label: '비공개', icon: Lock, tip: '나만 볼 수 있어요' },
  { value: 'link', label: '링크 공유', icon: LinkIcon, tip: '링크를 가진 사람만 볼 수 있어요' },
  { value: 'public', label: '전체 공개', icon: Globe, tip: '누구나 볼 수 있어요' },
];

export function ShareModal({ opened, onClose, nodeId, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/view/${nodeId}`
    : `https://ouuniverse.com/view/${nodeId}`;

  const ogImageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/og/${nodeId}`
    : `https://ouuniverse.com/api/og/${nodeId}`;

  // Load current visibility when modal opens
  useEffect(() => {
    if (!opened) return;
    setCopied(false);

    (async () => {
      try {
        const res = await fetch(`/api/nodes/${nodeId}/visibility`);
        if (res.ok) {
          const data = await res.json();
          setVisibility(data.visibility ?? 'private');
        }
      } catch {
        // Silent — keep default
      }
    })();
  }, [opened, nodeId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      notifications.show({
        message: '복사됨!',
        color: 'gray',
        autoClose: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      notifications.show({
        message: '복사됨!',
        color: 'gray',
        autoClose: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVisibilityChange = async (newValue: string) => {
    const v = newValue as Visibility;
    const prev = visibility;
    setVisibility(v);
    setVisibilityLoading(true);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: v }),
      });
      if (!res.ok) {
        setVisibility(prev);
      }
    } catch {
      setVisibility(prev);
    } finally {
      setVisibilityLoading(false);
    }
  };

  const isShareable = visibility !== 'private';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>공유</Text>}
      centered
      size="md"
    >
      <Stack gap="lg">
        {/* Visibility selector */}
        <Box>
          <Text fz="xs" c="dimmed" mb={8}>공개 범위</Text>
          <SegmentedControl
            fullWidth
            value={visibility}
            onChange={handleVisibilityChange}
            disabled={visibilityLoading}
            data={VISIBILITY_OPTIONS.map(opt => ({
              value: opt.value,
              label: (
                <Tooltip label={opt.tip} position="bottom" withArrow>
                  <Group gap={6} wrap="nowrap" justify="center">
                    <opt.icon size={16} weight="light" />
                    <Text fz="xs">{opt.label}</Text>
                  </Group>
                </Tooltip>
              ),
            }))}
            styles={{
              root: {
                background: 'var(--mantine-color-default)',
                border: '0.5px solid var(--mantine-color-default-border)',
              },
            }}
          />
        </Box>

        {/* Share link */}
        <Box>
          <Text fz="xs" c="dimmed" mb={8}>링크</Text>
          <Group gap="xs" wrap="nowrap">
            <TextInput
              value={shareUrl}
              readOnly
              flex={1}
              styles={{
                input: {
                  border: '0.5px solid var(--mantine-color-default-border)',
                  fontSize: 'var(--mantine-font-size-xs)',
                  color: isShareable
                    ? 'var(--mantine-color-text)'
                    : 'var(--mantine-color-dimmed)',
                },
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Tooltip label={copied ? '복사됨!' : '링크 복사'} position="bottom" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={handleCopy}
                style={{
                  border: '0.5px solid var(--mantine-color-default-border)',
                  borderRadius: 'var(--mantine-radius-sm)',
                }}
              >
                {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="light" />}
              </ActionIcon>
            </Tooltip>
          </Group>
          {!isShareable && (
            <Text fz={11} c="dimmed" mt={4}>
              비공개 상태에서는 본인만 접근할 수 있어요. 공유하려면 공개 범위를 변경하세요.
            </Text>
          )}
        </Box>

        {/* OG preview */}
        {isShareable && (
          <Box>
            <Text fz="xs" c="dimmed" mb={8}>미리보기</Text>
            <Box
              style={{
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-sm)',
                overflow: 'hidden',
              }}
            >
              <Image
                src={ogImageUrl}
                alt="공유 미리보기"
                w="100%"
                h="auto"
                fallbackSrc=""
                style={{ display: 'block' }}
              />
              <Box px="sm" py="xs" style={{ borderTop: '0.5px solid var(--mantine-color-default-border)' }}>
                <Text fz="xs" fw={500} lineClamp={1}>
                  {title ?? 'OU'}
                </Text>
                <Text fz={11} c="dimmed" lineClamp={1}>
                  ouuniverse.com
                </Text>
              </Box>
            </Box>
          </Box>
        )}
      </Stack>
    </Modal>
  );
}
