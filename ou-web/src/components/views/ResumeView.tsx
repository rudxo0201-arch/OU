'use client';

import { useMemo } from 'react';
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
    <div
      className="resume-view-print"
      style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', marginBottom: 32 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>이름</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
          email@example.com · 010-0000-0000
        </span>
      </div>

      <div style={{ borderTop: '2px solid currentColor', marginBottom: 24 }} />

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 12, letterSpacing: 1 }}>
            {section.title}
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
            {section.items.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', width: 64, flexShrink: 0, paddingTop: 2 }}>
                  {item.date ? dayjs(item.date).format('YYYY.MM') : ''}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, display: 'block' }}>
                    {item.title}
                  </span>
                  {item.description && item.description !== item.title && (
                    <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginTop: 2, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {si < sections.length - 1 && (
            <div style={{ borderTop: '0.5px solid var(--ou-border, #333)', marginTop: 16 }} />
          )}
        </div>
      ))}

      {/* Print button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '8px 20px',
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FilePdf size={16} />
          PDF 다운로드
        </button>
      </div>

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
    </div>
  );
}
