'use client';

import { useMemo } from 'react';
import {
  Box, Group, Text, Stack, Button, Divider,
} from '@mantine/core';
import { FilePdf } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface ResumeSection {
  title: string;
  items: {
    id: string;
    date: string;
    title: string;
    description: string;
  }[];
}

export function ResumeView({ nodes }: ViewProps) {
  const sections: ResumeSection[] = useMemo(() => {
    const career: ResumeSection['items'] = [];
    const skills: ResumeSection['items'] = [];
    const projects: ResumeSection['items'] = [];
    const education: ResumeSection['items'] = [];
    const other: ResumeSection['items'] = [];

    for (const n of nodes) {
      const dd = n.domain_data ?? {};
      const domain = n.domain ?? 'unresolved';
      const item = {
        id: n.id,
        date: dd.date ?? n.created_at ?? '',
        title: dd.title ?? dd.name ?? ((n.raw ?? '').slice(0, 40) || ''),
        description: dd.description ?? dd.content ?? dd.memo ?? n.raw ?? '',
      };

      if (domain === 'relation') {
        const rel = (dd.relationship ?? dd.type ?? '').toLowerCase();
        if (rel.includes('직장') || rel.includes('회사') || rel.includes('동료') || rel.includes('상사')) {
          career.push(item);
          continue;
        }
      }

      if (domain === 'knowledge') {
        skills.push(item);
      } else if (domain === 'task') {
        projects.push(item);
      } else if (domain === 'education') {
        education.push(item);
      } else {
        other.push(item);
      }
    }

    const sortByDate = (a: { date: string }, b: { date: string }) =>
      a.date > b.date ? -1 : 1;

    const result: ResumeSection[] = [];
    if (career.length > 0) result.push({ title: '경력', items: career.sort(sortByDate) });
    if (education.length > 0) result.push({ title: '학력', items: education.sort(sortByDate) });
    if (skills.length > 0) result.push({ title: '기술 및 역량', items: skills.sort(sortByDate) });
    if (projects.length > 0) result.push({ title: '프로젝트', items: projects.sort(sortByDate) });
    if (other.length > 0) result.push({ title: '기타', items: other.sort(sortByDate) });

    return result;
  }, [nodes]);

  const handlePrint = () => {
    window.print();
  };

  if (nodes.length === 0) return null;

  return (
    <Box
      className="resume-view-print"
      p="xl"
      mx="auto"
      style={{ maxWidth: 720 }}
    >
      {/* Header */}
      <Stack gap={2} align="center" mb="xl">
        <Text fz="xl" fw={700}>이름</Text>
        <Text fz="xs" c="dimmed">
          email@example.com · 010-0000-0000
        </Text>
      </Stack>

      <Divider color="var(--mantine-color-dark-6)" size="sm" mb="lg" />

      {/* Sections */}
      {sections.map((section, si) => (
        <Box key={section.title} mb="lg">
          <Text fz="sm" fw={700} tt="uppercase" mb="sm"
            style={{ letterSpacing: 1 }}
          >
            {section.title}
          </Text>

          <Stack gap="sm" pl="sm">
            {section.items.map(item => (
              <Group key={item.id} gap="md" align="flex-start" wrap="nowrap">
                <Text fz={10} c="dimmed" style={{ width: 64, flexShrink: 0, paddingTop: 2 }}>
                  {item.date ? dayjs(item.date).format('YYYY.MM') : ''}
                </Text>
                <Box style={{ flex: 1 }}>
                  <Text fz="sm" fw={500} lh={1.4}>
                    {item.title}
                  </Text>
                  {item.description && item.description !== item.title && (
                    <Text fz="xs" c="dimmed" mt={2} lineClamp={3} style={{ lineHeight: 1.6 }}>
                      {item.description}
                    </Text>
                  )}
                </Box>
              </Group>
            ))}
          </Stack>

          {si < sections.length - 1 && (
            <Divider color="var(--mantine-color-default-border)" mt="md" />
          )}
        </Box>
      ))}

      {/* Print button */}
      <Group justify="center" mt="xl">
        <Button
          variant="outline"
          color="gray"
          size="sm"
          leftSection={<FilePdf size={16} />}
          onClick={handlePrint}
        >
          PDF 다운로드
        </Button>
      </Group>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .resume-view-print, .resume-view-print * { visibility: visible; }
          .resume-view-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 720px;
            margin: 0 auto;
            padding: 40px;
          }
          .resume-view-print button { display: none !important; }
        }
      `}</style>
    </Box>
  );
}
