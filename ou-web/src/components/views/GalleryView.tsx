'use client';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

interface GalleryItem {
  id: string;
  title: string;
  imageUrl?: string;
  initial: string;
}

export function GalleryView({ nodes }: ViewProps) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const items: GalleryItem[] = useMemo(
    () =>
      nodes.map(n => {
        const title = n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || 'Untitled');
        return {
          id: n.id,
          title,
          imageUrl: n.domain_data?.image_url ?? n.domain_data?.thumbnail ?? undefined,
          initial: (title[0] ?? '?').toUpperCase(),
        };
      }),
    [nodes],
  );

  if (nodes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginBottom: 16 }}>Gallery</span>

      <div
        style={{
          columnCount: 3,
          columnGap: 8,
        }}
      >
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            style={{
              breakInside: 'avoid',
              marginBottom: 8,
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 6,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {item.imageUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ display: 'block', width: '100%' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px 8px 6px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'white', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <span
                  style={{ fontSize: 28, fontWeight: 700, color: 'var(--ou-text-dimmed, #888)', lineHeight: 1, display: 'block', marginBottom: 6 }}
                >
                  {item.initial}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal overlay */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--ou-bg, #111)',
              borderRadius: 12,
              maxWidth: 640,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '0.5px solid var(--ou-border, #333)',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--ou-border, #333)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{selected.title}</span>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18, padding: 4 }}
              >
                x
              </button>
            </div>
            <div style={{ padding: 16 }}>
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.title} style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span style={{ fontSize: 64, fontWeight: 700, color: 'var(--ou-text-dimmed, #888)' }}>{selected.initial}</span>
                  <p style={{ fontSize: 13, marginTop: 16 }}>{selected.title}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
