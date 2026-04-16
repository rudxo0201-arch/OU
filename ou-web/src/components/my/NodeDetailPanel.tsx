'use client';

import { useState, useEffect } from 'react';
import {
  Stack, Text, Badge, ActionIcon, Group, Box, Button,
  TextInput, Textarea, Loader, Tooltip,
} from '@mantine/core';
import { X, ArrowRight, PencilSimple, Trash, FloppyDisk } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { VisibilityToggle } from '@/components/ui/VisibilityToggle';
import { getPredicateLabel, getDomainLabel, getDomainStyle, getConfidenceLabel, getConfidenceNumeric } from '@/lib/utils/domain';
import type { Visibility } from '@/types';

interface Triple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: string;
}

interface RelatedNode {
  id: string;
  raw?: string;
  domain: string;
  predicate?: string;
}

/** Confidence dot indicator */
function ConfidenceDot({ confidence }: { confidence?: string | null }) {
  const numericVal = getConfidenceNumeric(confidence);
  const label = getConfidenceLabel(confidence);

  // High: solid, Medium: half-filled, Low: outline
  const size = 10;
  const isHigh = numericVal > 0.8;
  const isMedium = numericVal >= 0.5 && numericVal <= 0.8;

  return (
    <Tooltip label={`신뢰도: ${label}`} withArrow>
      <Box
        component="span"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1.5px solid var(--mantine-color-gray-5)',
          background: isHigh
            ? 'var(--mantine-color-gray-5)'
            : isMedium
              ? 'linear-gradient(to top, var(--mantine-color-gray-5) 50%, transparent 50%)'
              : 'transparent',
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

interface NodeDetailPanelProps {
  node: {
    id: string;
    domain: string;
    raw?: string;
    importance?: number;
    graph_type?: string;
    source_file_url?: string;
    created_at?: string;
    confidence?: string;
    visibility?: Visibility;
    domain_data?: Record<string, any>;
  };
  onClose: () => void;
  onNodeUpdated?: (node: any) => void;
  onNodeDeleted?: (nodeId: string) => void;
  onRelatedNodeClick?: (nodeId: string) => void;
}

export function NodeDetailPanel({
  node,
  onClose,
  onNodeUpdated,
  onNodeDeleted,
  onRelatedNodeClick,
}: NodeDetailPanelProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(node.domain_data ?? {});
  const [editRaw, setEditRaw] = useState(node.raw ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [relatedNodes, setRelatedNodes] = useState<RelatedNode[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [triples, setTriples] = useState<Triple[]>([]);
  const [loadingTriples, setLoadingTriples] = useState(true);

  // Fetch related nodes
  useEffect(() => {
    setLoadingRelated(true);
    setRelatedNodes([]);
    setConfirmDelete(false);
    setEditing(false);
    setEditData(node.domain_data ?? {});
    setEditRaw(node.raw ?? '');

    fetch(`/api/nodes/${node.id}/relations`)
      .then(res => res.ok ? res.json() : { relations: [] })
      .then(data => setRelatedNodes(data.relations ?? []))
      .catch(() => setRelatedNodes([]))
      .finally(() => setLoadingRelated(false));

    setLoadingTriples(true);
    setTriples([]);
    fetch(`/api/nodes/${node.id}/triples`)
      .then(res => res.ok ? res.json() : { triples: [] })
      .then(data => setTriples(data.triples ?? []))
      .catch(() => setTriples([]))
      .finally(() => setLoadingTriples(false));
  }, [node.id, node.domain_data, node.raw]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: editRaw, domain_data: editData }),
      });
      if (res.ok) {
        onNodeUpdated?.({ ...node, raw: editRaw, domain_data: editData });
        setEditing(false);
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onNodeDeleted?.(node.id);
        onClose();
      }
    } catch {
      // Silent fail
    } finally {
      setDeleting(false);
    }
  };

  const domainDataEntries = Object.entries(editData);

  return (
    <>
      {/* 데스크톱: 우측 슬라이드인 */}
      <GlassCard
        p="lg"
        className="node-detail-panel"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          bottom: 16,
          width: 320,
          zIndex: 20,
          overflowY: 'auto',
          animation: 'ou-slide-in-right 200ms ease',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap={6}>
              {(() => {
                const ds = getDomainStyle(node.domain);
                return (
                  <Badge
                    variant="light"
                    color="gray"
                    size="sm"
                    style={{
                      borderStyle: ds.borderStyle,
                      borderWidth: ds.borderWidth,
                      borderColor: 'var(--mantine-color-default-border)',
                      borderRadius: ds.borderRadius,
                      fontWeight: ds.fontWeight,
                    }}
                  >
                    {node.graph_type === 'star' ? '\u2605' : '\u25CF'} {getDomainLabel(node.domain)}
                  </Badge>
                );
              })()}
              {node.importance != null && node.importance >= 3 && (
                <Badge variant="light" color="yellow" size="sm">
                  중요
                </Badge>
              )}
              <ConfidenceDot confidence={node.confidence} />
            </Group>
            <ActionIcon size="sm" variant="subtle" color="gray" onClick={onClose}>
              <X size={14} />
            </ActionIcon>
          </Group>

          {/* Raw text - editable or display */}
          {editing ? (
            <Textarea
              value={editRaw}
              onChange={e => setEditRaw(e.target.value)}
              minRows={3}
              maxRows={8}
              autosize
              styles={{ input: { fontSize: 'var(--mantine-font-size-sm)' } }}
            />
          ) : (
            <Text fz="sm" style={{ wordBreak: 'break-word', lineHeight: 1.6 }}>
              {node.raw ?? '(내용 없음)'}
            </Text>
          )}

          {/* Domain data fields */}
          {editing && domainDataEntries.length > 0 && (
            <Stack gap="xs">
              <Text fz="xs" fw={600} c="dimmed">상세 정보</Text>
              {domainDataEntries.map(([key, value]) => (
                <TextInput
                  key={key}
                  label={key}
                  value={typeof value === 'string' ? value : JSON.stringify(value)}
                  onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  size="xs"
                />
              ))}
            </Stack>
          )}

          {/* Non-editing: show domain_data summary */}
          {!editing && domainDataEntries.length > 0 && (
            <Stack gap={4}>
              <Text fz="xs" fw={600} c="dimmed">상세 정보</Text>
              {domainDataEntries.map(([key, value]) => (
                <Group key={key} gap={4}>
                  <Text fz="xs" c="dimmed">{key}:</Text>
                  <Text fz="xs">{typeof value === 'string' ? value : JSON.stringify(value)}</Text>
                </Group>
              ))}
            </Stack>
          )}

          {node.created_at && (
            <Text fz="xs" c="dimmed">
              {new Date(node.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </Text>
          )}

          {/* Visibility Toggle */}
          <Box>
            <Text fz="xs" fw={600} c="dimmed" mb={4}>공개 설정</Text>
            <VisibilityToggle
              nodeId={node.id}
              currentVisibility={node.visibility ?? 'private'}
            />
          </Box>

          <Box style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12 }}>
            <Stack gap="xs">
              {/* Edit / Save buttons */}
              {editing ? (
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    color="gray"
                    leftSection={<FloppyDisk size={14} />}
                    onClick={handleSave}
                    loading={saving}
                    flex={1}
                  >
                    저장
                  </Button>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    onClick={() => {
                      setEditing(false);
                      setEditRaw(node.raw ?? '');
                      setEditData(node.domain_data ?? {});
                    }}
                    flex={1}
                  >
                    취소
                  </Button>
                </Group>
              ) : (
                <Button
                  variant="subtle"
                  size="xs"
                  fullWidth
                  justify="space-between"
                  rightSection={<PencilSimple size={14} />}
                  onClick={() => setEditing(true)}
                >
                  편집
                </Button>
              )}

              {/* Delete button */}
              {!editing && (
                confirmDelete ? (
                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      color="red"
                      onClick={handleDelete}
                      loading={deleting}
                      flex={1}
                    >
                      정말 삭제
                    </Button>
                    <Button
                      variant="subtle"
                      size="xs"
                      color="gray"
                      onClick={() => setConfirmDelete(false)}
                      flex={1}
                    >
                      취소
                    </Button>
                  </Group>
                ) : (
                  <Button
                    variant="subtle"
                    size="xs"
                    fullWidth
                    justify="space-between"
                    rightSection={<Trash size={14} />}
                    color="red"
                    onClick={() => setConfirmDelete(true)}
                  >
                    삭제
                  </Button>
                )
              )}

              {node.source_file_url && (
                <Button
                  variant="subtle"
                  size="xs"
                  fullWidth
                  justify="space-between"
                  rightSection={<ArrowRight size={14} />}
                  onClick={() => router.push(`/view/${node.id}`)}
                >
                  원본 보기
                </Button>
              )}
            </Stack>
          </Box>

          {/* Triples */}
          <Box style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12 }}>
            <Text fz="xs" fw={600} c="dimmed" mb={8}>관계 정보</Text>
            {loadingTriples ? (
              <Group justify="center" py="xs">
                <Loader size="xs" color="gray" />
              </Group>
            ) : triples.length === 0 ? (
              <Text fz="xs" c="dimmed">추출된 관계가 없어요</Text>
            ) : (
              <Stack gap={6}>
                {triples.map(t => (
                  <Group key={t.id} gap={4} wrap="nowrap" align="center">
                    <ConfidenceDot confidence={t.confidence} />
                    <Text fz="xs" style={{ lineHeight: 1.5 }}>
                      <Text component="span" fz="xs" fw={500}>{t.subject}</Text>
                      {' '}
                      <Text component="span" fz="xs" c="dimmed">{getPredicateLabel(t.predicate)}</Text>
                      {' '}
                      <Text component="span" fz="xs" fw={500}>{t.object}</Text>
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Box>

          {/* Related nodes */}
          <Box style={{ borderTop: '0.5px solid var(--mantine-color-default-border)', paddingTop: 12 }}>
            <Text fz="xs" fw={600} c="dimmed" mb={8}>연결된 데이터</Text>
            {loadingRelated ? (
              <Group justify="center" py="xs">
                <Loader size="xs" color="gray" />
              </Group>
            ) : relatedNodes.length === 0 ? (
              <Text fz="xs" c="dimmed">연결된 데이터가 없어요</Text>
            ) : (
              <Stack gap={4}>
                {relatedNodes.map(rel => (
                  <Button
                    key={rel.id}
                    variant="subtle"
                    size="xs"
                    fullWidth
                    justify="flex-start"
                    color="gray"
                    onClick={() => onRelatedNodeClick?.(rel.id)}
                    styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                  >
                    <Group gap={6} wrap="nowrap">
                      {rel.predicate && (
                        <Badge variant="dot" color="gray" size="xs">{getPredicateLabel(rel.predicate)}</Badge>
                      )}
                      <Text fz="xs" lineClamp={1}>{rel.raw ?? rel.domain}</Text>
                    </Group>
                  </Button>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </GlassCard>
    </>
  );
}
