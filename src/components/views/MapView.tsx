'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MagnifyingGlass, MapPin, X } from '@phosphor-icons/react';
import { loadKakaoMapSDK, type KakaoMap, type KakaoMarker, type KakaoPlaceResult } from '@/lib/kakao-map';
import type { ViewProps } from './registry';

interface GeoNode {
  id: string;
  title: string;
  locationText: string;
  date?: string;
  status: 'pending' | 'ok' | 'failed';
  lat?: number;
  lng?: number;
  address?: string;
  markerRef?: KakaoMarker;
}

/** 인라인 장소 검색 패널 */
function PlaceSearchPanel({
  nodeId,
  nodeTitle,
  initialQuery,
  onSelect,
  onClose,
}: {
  nodeId: string;
  nodeTitle: string;
  initialQuery: string;
  onSelect: (nodeId: string, lat: number, lng: number, address: string, name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);

    try {
      await loadKakaoMapSDK();
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(query.trim(), (result, status) => {
        setSearching(false);
        setSearched(true);
        if (status === window.kakao.maps.services.Status.OK) {
          setResults(result.slice(0, 5));
        } else {
          setResults([]);
        }
      });
    } catch {
      setSearching(false);
      setSearched(true);
      setResults([]);
    }
  }, [query]);

  // 최초 진입 시 자동 검색
  useEffect(() => {
    if (initialQuery) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      border: '0.5px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-md)',
      overflow: 'hidden',
      background: 'var(--ou-bg)',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--ou-border-faint)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-heading)' }}>
            <MapPin size={12} style={{ marginRight: 4 }} />
            {nodeTitle} — 장소 찾기
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ou-text-muted)', padding: 2, display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) search(); }}
            placeholder="장소명 또는 주소 입력"
            className="input-block"
            style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
            autoFocus
          />
          <button
            onClick={search}
            disabled={searching}
            style={{
              background: 'var(--ou-bg)', border: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center',
              boxShadow: 'var(--ou-neu-raised-sm)', color: 'var(--ou-text-body)',
            }}
          >
            <MagnifyingGlass size={14} />
          </button>
        </div>
      </div>

      <div>
        {searching && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ou-text-muted)' }}>검색 중…</div>
        )}
        {!searching && searched && results.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ou-text-muted)' }}>검색 결과가 없습니다</div>
        )}
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onSelect(nodeId, parseFloat(r.y), parseFloat(r.x), r.road_address_name || r.address_name, r.place_name)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 14px', background: 'none', border: 'none',
              borderBottom: i < results.length - 1 ? '0.5px solid var(--ou-border-faint)' : 'none',
              cursor: 'pointer', transition: '150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-heading)' }}>{r.place_name}</div>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>
              {r.road_address_name || r.address_name}
            </div>
            {r.category_name && (
              <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', marginTop: 1 }}>{r.category_name}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MapView({ nodes, inline }: ViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const [geoNodes, setGeoNodes] = useState<GeoNode[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [searchingNodeId, setSearchingNodeId] = useState<string | null>(null);

  // 위치 텍스트가 있는 노드 추출
  const locationNodes: GeoNode[] = nodes
    .filter(n => n.domain_data?.location || n.domain_data?.address)
    .map(n => ({
      id: n.id,
      title: n.domain_data?.title ?? (n.raw ?? '').slice(0, 20) ?? '장소',
      locationText: n.domain_data?.location || n.domain_data?.address,
      date: n.domain_data?.date,
      status: 'pending' as const,
    }));

  // 지오코딩
  useEffect(() => {
    if (locationNodes.length === 0) return;
    let cancelled = false;

    async function geocodeAll() {
      const results = await Promise.all(
        locationNodes.map(async (node) => {
          try {
            const res = await fetch(`/api/geocode?query=${encodeURIComponent(node.locationText)}`);
            if (!res.ok) return { ...node, status: 'failed' as const };
            const data = await res.json();
            return { ...node, status: 'ok' as const, lat: data.lat, lng: data.lng, address: data.address };
          } catch {
            return { ...node, status: 'failed' as const };
          }
        })
      );
      if (!cancelled) setGeoNodes(results);
    }

    geocodeAll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // SDK 로드
  useEffect(() => {
    loadKakaoMapSDK().then(() => setSdkReady(true)).catch(() => {});
  }, []);

  // 지도 렌더링
  useEffect(() => {
    const validNodes = geoNodes.filter(n => n.status === 'ok' && n.lat && n.lng);
    if (!sdkReady || validNodes.length === 0 || !mapRef.current) return;

    const kakao = window.kakao;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(validNodes[0].lat!, validNodes[0].lng!),
        level: validNodes.length > 1 ? 7 : 4,
      });
    }

    const map = mapInstanceRef.current;

    validNodes.forEach((node) => {
      if (node.markerRef) return; // 이미 찍힌 핀 스킵
      const position = new kakao.maps.LatLng(node.lat!, node.lng!);
      const marker = new kakao.maps.Marker({ map, position, title: node.title });
      node.markerRef = marker;

      const infoContent = `
        <div style="padding:10px 14px;min-width:140px;font-size:12px;line-height:1.6;">
          <div style="font-weight:600;margin-bottom:2px;">${node.title}</div>
          ${node.date ? `<div style="color:#888;font-size:11px;">${node.date}</div>` : ''}
          <div style="color:#888;font-size:11px;margin-top:2px;">${node.address || node.locationText}</div>
        </div>
      `;
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent });
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
    });

    if (validNodes.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      validNodes.forEach(n => bounds.extend(new kakao.maps.LatLng(n.lat!, n.lng!)));
      map.setBounds(bounds);
    }
  }, [geoNodes, sdkReady]);

  // 장소 선택 확정
  const handlePlaceSelect = useCallback(async (nodeId: string, lat: number, lng: number, address: string, name: string) => {
    setSearchingNodeId(null);

    // 지도에 핀 추가
    if (sdkReady && mapInstanceRef.current) {
      const kakao = window.kakao;
      const position = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({ map: mapInstanceRef.current, position });
      const node = geoNodes.find(n => n.id === nodeId);
      const title = node?.title ?? '';
      const infoContent = `<div style="padding:10px 14px;min-width:140px;font-size:12px;"><div style="font-weight:600;">${name}</div><div style="color:#888;font-size:11px;">${address}</div></div>`;
      const infoWindow = new kakao.maps.InfoWindow({ content: infoContent });
      kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(mapInstanceRef.current!, marker));
      mapInstanceRef.current.setCenter(position);
      void title;
    }

    // geoNodes 업데이트
    setGeoNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, status: 'ok', lat, lng, address, locationText: name } : n
    ));

    // domain_data 저장 — 기존 domain_data 가져와서 병합
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      await fetch(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_data: {
            ...targetNode.domain_data,
            location: name,
            address,
            lat,
            lng,
          },
        }),
      });
    }
  }, [geoNodes, nodes, sdkReady]);

  if (locationNodes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        위치 정보가 있는 데이터가 없습니다
      </div>
    );
  }

  const failedNodes = geoNodes.filter(n => n.status === 'failed');
  const isLoading = geoNodes.length === 0 || geoNodes.some(n => n.status === 'pending');
  const height = inline ? 200 : '100%';
  const minHeight = inline ? undefined : 360;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: inline ? 'auto' : '100%' }}>
      {/* 지도 */}
      <div style={{ position: 'relative', width: '100%', height, minHeight, borderRadius: 'var(--ou-radius-md)', overflow: 'hidden', flexShrink: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--ou-bg)', opacity: 0.85,
            fontSize: 12, color: 'var(--ou-text-muted)',
          }}>
            지도 불러오는 중…
          </div>
        )}
      </div>

      {/* 위치 확인 필요 목록 (inline 모드에서는 숨김) */}
      {!inline && failedNodes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {failedNodes.map(node => (
            <div key={node.id}>
              {searchingNodeId === node.id ? (
                <PlaceSearchPanel
                  nodeId={node.id}
                  nodeTitle={node.title}
                  initialQuery={node.locationText}
                  onSelect={handlePlaceSelect}
                  onClose={() => setSearchingNodeId(null)}
                />
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-md)',
                }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-heading)' }}>{node.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginLeft: 8 }}>
                      "{node.locationText}" — 위치를 특정할 수 없습니다
                    </span>
                  </div>
                  <button
                    onClick={() => setSearchingNodeId(node.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'var(--ou-bg)', border: 'none', cursor: 'pointer',
                      padding: '6px 10px', borderRadius: 8, fontSize: 11,
                      boxShadow: 'var(--ou-neu-raised-sm)', color: 'var(--ou-text-body)',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    <MapPin size={12} />
                    장소 찾기
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
