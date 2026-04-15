'use client';

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Stack, Text, Group, UnstyledButton } from '@mantine/core';
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
        center: new window.kakao.maps.LatLng(37.5665, 126.978), // 서울 기본
        level: 7,
      };
      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      // Places + Geocoder for location search
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

          // 모든 검색 완료 후 바운드 피팅
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
    <Stack gap="md" p="md">
      <Group justify="space-between" align="baseline">
        <Text fz="sm" fw={600}>장소 지도</Text>
        <Text fz="xs" c="dimmed">{mapNodes.length}개 장소</Text>
      </Group>

      {hasKey && mapNodes.length > 0 ? (
        <>
          <Script
            src={KAKAO_SDK_URL}
            strategy="afterInteractive"
            onReady={() => setSdkLoaded(true)}
          />
          <Box
            ref={mapRef}
            style={{
              width: '100%',
              height: 360,
              borderRadius: 8,
              border: '0.5px solid var(--mantine-color-default-border)',
              overflow: 'hidden',
            }}
          />
        </>
      ) : (
        <Box
          py="xl"
          style={{
            textAlign: 'center',
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 8,
          }}
        >
          <MapPin size={32} weight="light" style={{ opacity: 0.3 }} />
          <Text fz="xs" c="dimmed" mt="xs">
            {!hasKey ? '지도 API 키가 설정되지 않았습니다' : '위치 정보가 있는 데이터가 없습니다'}
          </Text>
        </Box>
      )}

      {/* 장소 리스트 */}
      <Stack gap="xs">
        {mapNodes.map(node => (
          <UnstyledButton
            key={node.id}
            onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: selectedId === node.id
                ? '1px solid var(--mantine-color-dark-4)'
                : '0.5px solid var(--mantine-color-default-border)',
              transition: 'all 150ms',
              textAlign: 'left',
            }}
          >
            <Group gap="xs" wrap="nowrap">
              <MapPin size={14} weight="bold" style={{ flexShrink: 0, opacity: 0.5 }} />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fz="xs" fw={500} lineClamp={1}>{node.title}</Text>
                <Group gap="xs">
                  <Text fz={10} c="dimmed">{node.location}</Text>
                  {node.date && (
                    <Text fz={10} c="dimmed">{dayjs(node.date).format('M/D')}</Text>
                  )}
                </Group>
              </Box>
            </Group>
          </UnstyledButton>
        ))}

        {noLocationNodes.length > 0 && (
          <>
            <Text fz={10} c="dimmed" mt="xs">장소 미지정</Text>
            {noLocationNodes.map(node => (
              <Box
                key={node.id}
                px="sm"
                py={6}
                style={{
                  borderRadius: 8,
                  border: '0.5px dashed var(--mantine-color-gray-4)',
                }}
              >
                <Text fz="xs" c="dimmed" lineClamp={1}>{node.title}</Text>
              </Box>
            ))}
          </>
        )}
      </Stack>
    </Stack>
  );
}
