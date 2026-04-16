'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarBlank, Kanban, ChartBar, Graph, TreeStructure,
  SquaresFour, BookOpen, Clock, Cards, BookBookmark,
  FileText, Table, Trash, X, FloppyDisk,
  FilePdf, Presentation, User, UsersThree,
  Heartbeat, IdentificationBadge, Camera,
} from '@phosphor-icons/react';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { VIEW_SCHEMA_HINTS, getSchemaHint, calculateFieldCoverage } from '@/lib/views/schema-hints';
import { ViewRenderer } from '@/components/views/ViewRenderer';
import { LayoutDesignPanel } from './LayoutDesignPanel';
import type { LayoutConfig } from '@/types/layout-config';

const VIEW_TYPE_ICONS: Record<string, any> = {
  calendar: CalendarBlank,
  task: Kanban,
  chart: ChartBar,
  knowledge_graph: Graph,
  mindmap: TreeStructure,
  heatmap: SquaresFour,
  journal: BookOpen,
  timeline: Clock,
  flashcard: Cards,
  dictionary: BookBookmark,
  document: FileText,
  table: Table,
  pdf: FilePdf,
  lecture: Presentation,
  profile: User,
  relationship: UsersThree,
  health: Heartbeat,
  resume: IdentificationBadge,
  snapshot: Camera,
};

const DOMAIN_OPTIONS = [
  { value: 'schedule', label: '일정' },
  { value: 'task', label: '할 일' },
  { value: 'habit', label: '습관' },
  { value: 'knowledge', label: '지식' },
  { value: 'idea', label: '아이디어' },
  { value: 'relation', label: '관계' },
  { value: 'emotion', label: '감정' },
  { value: 'finance', label: '가계' },
  { value: 'product', label: '상품' },
  { value: 'broadcast', label: '방송' },
  { value: 'education', label: '교육' },
  { value: 'media', label: '미디어' },
  { value: 'location', label: '장소' },
];

interface ViewEditorDrawerProps {
  nodes: any[];
  onSaved: () => void;
}

export function ViewEditorDrawer({ nodes, onSaved }: ViewEditorDrawerProps) {
  const store = useViewEditorStore();
  const {
    isOpen, editingView, name, viewType, icon, description,
    filterConfig, layoutConfig, schemaMap, visibility, isDefault, saving,
    setField, setFilterField, removeFilterField, setSchemaField,
    removeSchemaField, setSaving, close,
  } = store;

  // 현재 필터에 맞는 노드만
  const filteredNodes = useMemo(() => {
    let result = nodes;
    const domain = filterConfig.domain;
    if (domain && typeof domain === 'string') {
      result = result.filter(n => n.domain === domain);
    }
    return result;
  }, [nodes, filterConfig]);

  // 스키마 힌트
  const currentHint = useMemo(() => getSchemaHint(viewType), [viewType]);
  const allFields = useMemo(() => {
    if (!currentHint) return [];
    return [...currentHint.requiredFields, ...currentHint.optionalFields];
  }, [currentHint]);
  const fieldCoverage = useMemo(
    () => calculateFieldCoverage(filteredNodes, allFields),
    [filteredNodes, allFields],
  );

  // 노드들의 실제 domain_data 키 목록
  const availableDataFields = useMemo(() => {
    const keys = new Set<string>();
    for (const n of filteredNodes) {
      if (n.domain_data && typeof n.domain_data === 'object') {
        for (const k of Object.keys(n.domain_data)) {
          keys.add(k);
        }
      }
    }
    return Array.from(keys).sort().map(k => ({ value: k, label: k }));
  }, [filteredNodes]);

  // 존재하는 도메인만 필터에 표시
  const availableDomainOptions = useMemo(() => {
    const domains = new Set(nodes.map(n => n.domain).filter(Boolean));
    return DOMAIN_OPTIONS.filter(d => domains.has(d.value));
  }, [nodes]);

  const handleSave = async () => {
    if (!name.trim() || !viewType) return;
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        view_type: viewType,
        icon: icon || null,
        description: description || null,
        filter_config: Object.keys(filterConfig).length > 0 ? filterConfig : null,
        layout_config: Object.keys(layoutConfig).length > 0 ? layoutConfig : null,
        schema_map: Object.keys(schemaMap).length > 0 ? schemaMap : null,
        visibility,
        is_default: isDefault,
      };

      if (editingView) {
        // 업데이트
        const res = await fetch('/api/views', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingView.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
      } else {
        // 새로 생성
        const res = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name,
            viewType: payload.view_type,
            filterConfig: payload.filter_config,
          }),
        });
        if (!res.ok) throw new Error('Create failed');

        // 생성 후 추가 필드 업데이트 (icon, description, schema_map 등)
        const { view } = await res.json();
        if (view?.id) {
          await fetch('/api/views', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: view.id, ...payload }),
          });
        }
      }

      onSaved();
      close();
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingView) return;
    const res = await fetch(`/api/views?id=${editingView.id}`, { method: 'DELETE' });
    if (res.ok) {
      onSaved();
      close();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.5)',
        }}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '85%', zIndex: 1000,
          background: 'var(--mantine-color-body)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 상단 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
          <span style={{ fontWeight: 600 }}>
            {editingView ? `편집: ${editingView.name}` : '새 뷰 만들기'}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !viewType}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, padding: '4px 12px',
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 4, background: 'var(--mantine-color-dark-6)',
                color: 'inherit', cursor: 'pointer',
                opacity: (saving || !name.trim() || !viewType) ? 0.5 : 1,
              }}
            >
              <FloppyDisk size={14} />
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={close}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, border: 'none',
                background: 'transparent', color: 'inherit', cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 본문: 좌측 설정 + 우측 미리보기 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌측: 설정 (40%) */}
          <div style={{ width: '40%', borderRight: '0.5px solid var(--mantine-color-default-border)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>
              {/* 기본 정보 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>기본</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ width: 70 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>아이콘</label>
                    <input
                      type="text"
                      placeholder="📅"
                      value={icon}
                      onChange={e => setField('icon', e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>이름</label>
                    <input
                      type="text"
                      placeholder="뷰 이름"
                      value={name}
                      onChange={e => setField('name', e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>설명</label>
                  <textarea
                    placeholder="이 뷰의 용도를 간단히"
                    value={description}
                    onChange={e => setField('description', e.target.value)}
                    rows={2}
                    style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />

              {/* 뷰 타입 선택 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>뷰 타입</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {VIEW_SCHEMA_HINTS.map(hint => {
                    const Icon = VIEW_TYPE_ICONS[hint.viewType];
                    const isSelected = viewType === hint.viewType;
                    return (
                      <div
                        key={hint.viewType}
                        onClick={() => setField('viewType', hint.viewType)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 8,
                          border: `1px solid ${isSelected ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-default-border)'}`,
                          background: isSelected ? 'var(--mantine-color-dark-6)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {Icon && <Icon size={18} weight={isSelected ? 'fill' : 'light'} />}
                        <span style={{ fontSize: 10, marginTop: 2, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint.label}</span>
                      </div>
                    );
                  })}
                </div>
                {currentHint && (
                  <span style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)' }}>{currentHint.description}</span>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />

              {/* 데이터 필터 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>데이터 필터</span>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>도메인</label>
                  <select
                    value={(filterConfig.domain as string) ?? ''}
                    onChange={e => e.target.value ? setFilterField('domain', e.target.value) : removeFilterField('domain')}
                    style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
                  >
                    <option value="">전체</option>
                    {(availableDomainOptions.length > 0 ? availableDomainOptions : DOMAIN_OPTIONS).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />

              {/* 스키마 매핑 */}
              {currentHint && allFields.length > 0 && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>스키마 매핑</span>
                    <span style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)' }}>뷰가 기대하는 필드를 실제 데이터 필드에 연결</span>
                    {allFields.map(field => (
                      <div key={field} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                        <span style={{ fontSize: 12, width: 80, flexShrink: 0 }}>
                          {field}
                          {currentHint.requiredFields.includes(field) && (
                            <span style={{ color: 'red', fontSize: 12 }}> *</span>
                          )}
                        </span>
                        <select
                          value={schemaMap[field] ?? ''}
                          onChange={e => e.target.value ? setSchemaField(field, e.target.value) : removeSchemaField(field)}
                          style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, background: 'transparent', color: 'inherit', outline: 'none' }}
                        >
                          <option value="">선택</option>
                          {availableDataFields.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />
                </>
              )}

              {/* 디자인 에디터 */}
              <LayoutDesignPanel viewType={viewType} />

              <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />

              {/* 공개 설정 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>공개</span>
                <div style={{ display: 'flex', border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, overflow: 'hidden' }}>
                  {[
                    { value: 'private', label: '비공개' },
                    { value: 'link', label: '링크' },
                    { value: 'public', label: '공개' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setField('visibility', opt.value as 'private' | 'link' | 'public')}
                      style={{
                        flex: 1, fontSize: 12, padding: '6px 8px', border: 'none', cursor: 'pointer',
                        background: visibility === opt.value ? 'var(--mantine-color-gray-6)' : 'transparent',
                        color: visibility === opt.value ? '#fff' : 'inherit',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 삭제 */}
              {editingView && (
                <>
                  <div style={{ borderTop: '1px solid var(--mantine-color-default-border)' }} />
                  <button
                    onClick={handleDelete}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, padding: '6px 12px', border: 'none',
                      background: 'transparent', color: 'var(--mantine-color-red-6)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash size={14} />
                    이 뷰 삭제
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 우측: 미리보기 (60%) */}
          <div style={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 24px', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase' }}>미리보기</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {viewType && filteredNodes.length > 0 ? (
                <div style={{ border: '0.5px solid var(--mantine-color-default-border)', borderRadius: 8, overflow: 'hidden' }}>
                  <ViewRenderer
                    viewType={viewType}
                    nodes={filteredNodes}
                    filters={filterConfig}
                    layoutConfig={layoutConfig as LayoutConfig}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                  <span style={{ fontSize: 14, color: 'var(--mantine-color-dimmed)', textAlign: 'center' }}>
                    {!viewType ? '뷰 타입을 선택하면 미리보기가 표시됩니다' : '표시할 데이터가 없습니다'}
                  </span>
                </div>
              )}

              {/* 스키마 적합도 */}
              {currentHint && Object.keys(fieldCoverage).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mantine-color-dimmed)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>스키마 적합도</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {allFields.map(field => {
                      const pct = fieldCoverage[field] ?? 0;
                      const isReq = currentHint.requiredFields.includes(field);
                      return (
                        <div key={field} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: pct > 0 ? undefined : 'var(--mantine-color-dimmed)', width: 80 }}>
                            {pct > 0 ? '✓' : '○'} {field}
                          </span>
                          <div
                            style={{
                              flex: 1, height: 4, borderRadius: 2,
                              background: 'var(--mantine-color-dark-6)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`, height: '100%',
                                background: 'var(--mantine-color-gray-5)',
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--mantine-color-dimmed)', width: 40, textAlign: 'right' }}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
