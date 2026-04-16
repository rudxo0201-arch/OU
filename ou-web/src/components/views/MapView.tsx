'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { MapPin } from '@phosphor-icons/react';
import Script from 'next/script';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

declare global {
  interface Window {
    kakao: any;
  }
}

interface MapNode {
  id: string;
  title: string;
  location: string;
  date: string;
  raw: string;
}

const KAKAO_SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;

export function MapView({ nodes }: ViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapNodes: MapNode[] = useMemo(
    () =>
      nodes
        .filter(n => n.domain_data?.location)
        .map(n => ({
          id: n.id,
          title: n.domain_data?.title ?? (n.raw ?? '').slice(0, 20) ?? '장소',
          location: n.domain_data.location,
          date: n.domain_data?.date ?? n.created_at ?? '',
          raw: n.raw ?? '',
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  const noLocationNodes = useMemo(
    () =>
      nodes
        .filter(n => (n.domain === 'schedule' || n.domain === 'location') && !n.domain_data?.location)
        .map(n => ({
          id: n.id,
          title: n.domain_data?.title ?? (n.raw ?? '').slice(0, 20),
          date: n.domain_data?.date ?? n.created_at ?? '',
        })),
    [nodes],
  );

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const container = mapRef.current!;
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 7,
      };
      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      const ps = new window.kakao.maps.services.Places();
      const bounds = new window.kakao.maps.LatLngBounds();
      let resolvedCount = 0;

      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      if (mapNodes.length === 0) return;

      mapNodes.forEach((node) => {
        ps.keywordSearch(node.location, (data: any[], status: any) => {
          resolvedCount++;

          if (status === window.kakao.maps.services.Status.OK && data[0]) {
            const place = data[0];
            const position = new window.kakao.maps.LatLng(place.y, place.x);

            const marker = new window.kakao.maps.Marker({
              map,
              position,
            });

            const infoContent = `
              <div style="padding:8px 12px;font-size:12px;max-width:200px;line-height:1.5;color:#000">
                <strong>${node.title}</strong>
                <div style="color:#666;margin-top:2px">${node.location}</div>
                ${node.date ? `<div style="color:#999;margin-top:2px">${dayjs(node.date).format('M월 D일')}</div>` : ''}
              </div>
            `;
            const infowindow = new window.kakao.maps.InfoWindow({
              content: infoContent,
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
              infowindow.open(map, marker);
              setSelectedId(node.id);
            });

            markersRef.current.push(marker);
            bounds.extend(position);
          }

          if (resolvedCount === mapNodes.length && markersRef.current.length > 0) {
            map.setBounds(bounds);
          }
        });
      });
    });
  }, [mapNodes]);

  useEffect(() => {
    if (sdkLoaded) initMap();
  }, [sdkLoaded, initMap]);

  if (mapNodes.length === 0 && noLocationNodes.length === 0) return null;

  const hasKey = !!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>장소 지도</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{mapNodes.length}개 장소</span>
      </div>

      {hasKey && mapNodes.length > 0 ? (
        <>
          <Script
            src={KAKAO_SDK_URL}
            strategy="afterInteractive"
            onReady={() => setSdkLoaded(true)}
          />
          <div
            ref={mapRef}
            style={{
              width: '100%',
              height: 360,
              borderRadius: 8,
              border: '0.5px solid var(--ou-border, #333)',
              overflow: 'hidden',
            }}
          />
        </>
      ) : (
        <div
          style={{
            padding: '32px 0',
            textAlign: 'center',
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 8,
          }}
        >
          <MapPin size={32} weight="light" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginTop: 8 }}>
            {!hasKey ? '지도 API 키가 설정되지 않았습니다' : '위치 정보가 있는 데이터가 없습니다'}
          </p>
        </div>
      )}

      {/* Location list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mapNodes.map(node => (
          <button
            key={node.id}
            onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: selectedId === node.id
                ? '1px solid var(--ou-text-secondary, #666)'
                : '0.5px solid var(--ou-border, #333)',
              transition: 'all 150ms',
              textAlign: 'left',
              background: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
              <MapPin size={14} weight="bold" style={{ flexShrink: 0, opacity: 0.5 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>{node.location}</span>
                  {node.date && (
                    <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>{dayjs(node.date).format('M/D')}</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}

        {noLocationNodes.length > 0 && (
          <>
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', marginTop: 8 }}>장소 미지정</span>
            {noLocationNodes.map(node => (
              <div
                key={node.id}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '0.5px dashed var(--ou-gray-4, #aaa)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
