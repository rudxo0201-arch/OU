'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MagnifyingGlass, MapPin, X, Plus, Minus, Crosshair } from '@phosphor-icons/react';
import {
  loadKakaoMapSDK,
  type KakaoMap,
  type KakaoCustomOverlay,
  type KakaoPolyline,
  type KakaoClusterer,
  type KakaoMarker,
  type KakaoLatLng,
  type KakaoPlaceResult,
} from '@/lib/kakao-map';
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
  overlayRef?: KakaoCustomOverlay;
  cardRef?: KakaoCustomOverlay;
  markerRef?: KakaoMarker; // clusterer용
}

export interface RouteData {
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  waypoints?: { lat: number; lng: number }[];
  current?: { lat: number; lng: number };
}

/** OU 스타일 커스텀 마커 HTML */
function makePinHTML(tracking = false): string {
  return `<div class="ou-map-pin${tracking ? ' ou-map-pin--tracking' : ''}"><div class="ou-map-pin-inner"></div></div>`;
}

/** OU 스타일 카드 팝업 HTML */
function makeCardHTML(node: GeoNode): string {
  return `
    <div class="ou-map-card">
      <button class="ou-map-card-close" data-close="${node.id}" aria-label="닫기">✕</button>
      <div class="ou-map-card-title">${node.title}</div>
      ${node.date ? `<div class="ou-map-card-sub">${node.date}</div>` : ''}
      <div class="ou-map-card-sub">${node.address || node.locationText}</div>
    </div>
  `;
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
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--ou-surface-faint)')}
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
  const polylineRef = useRef<KakaoPolyline | null>(null);
  const clustererRef = useRef<KakaoClusterer | null>(null);
  const trackingOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const openCardRef = useRef<KakaoCustomOverlay | null>(null);

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
      ...(n.domain_data?.lat && n.domain_data?.lng
        ? { lat: n.domain_data.lat, lng: n.domain_data.lng, address: n.domain_data.address, status: 'ok' as const }
        : {}),
    }));

  // 지오코딩
  useEffect(() => {
    if (locationNodes.length === 0) return;
    let cancelled = false;

    async function geocodeAll() {
      const results = await Promise.all(
        locationNodes.map(async (node) => {
          if (node.status === 'ok') return node;
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

  // 지도 렌더링 (커스텀 오버레이 + 클러스터링)
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

    // 클러스터러 초기화
    if (!clustererRef.current) {
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 5,
        styles: [{
          width: '36px',
          height: '36px',
          background: 'var(--ou-bg, #e8ecf1)',
          borderRadius: '50%',
          color: 'var(--ou-text-heading, #1a1a2e)',
          textAlign: 'center',
          lineHeight: '36px',
          fontSize: '11px',
          fontWeight: '600',
          boxShadow: '4px 4px 8px rgba(163,177,198,0.5),-4px -4px 8px rgba(255,255,255,0.8)',
        }],
      });
    }

    const newMarkers: KakaoMarker[] = [];

    validNodes.forEach((node) => {
      if (node.overlayRef) return;
      const position = new kakao.maps.LatLng(node.lat!, node.lng!);

      // 커스텀 핀 오버레이
      const pinEl = document.createElement('div');
      pinEl.innerHTML = makePinHTML();
      const pinOverlay = new kakao.maps.CustomOverlay({
        position,
        content: pinEl,
        yAnchor: 1,
        zIndex: 3,
      });
      pinOverlay.setMap(map);
      node.overlayRef = pinOverlay;

      // 카드 팝업 (클릭 시 표시)
      const cardEl = document.createElement('div');
      cardEl.innerHTML = makeCardHTML(node);
      const cardOverlay = new kakao.maps.CustomOverlay({
        position,
        content: cardEl,
        yAnchor: 1,
        zIndex: 4,
      });
      node.cardRef = cardOverlay;

      // 닫기 버튼 이벤트
      cardEl.querySelector(`[data-close="${node.id}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        cardOverlay.setMap(null);
        openCardRef.current = null;
      });

      // 핀 클릭 → 카드 표시
      pinEl.addEventListener('click', () => {
        if (openCardRef.current && openCardRef.current !== cardOverlay) {
          openCardRef.current.setMap(null);
        }
        if (openCardRef.current === cardOverlay) {
          cardOverlay.setMap(null);
          openCardRef.current = null;
        } else {
          cardOverlay.setMap(map);
          openCardRef.current = cardOverlay;
        }
      });

      // 클러스터용 더미 마커 (invisible)
      const dummyMarker = new kakao.maps.Marker({ position }) as KakaoMarker & { setVisible?: (v: boolean) => void };
      newMarkers.push(dummyMarker);
      node.markerRef = dummyMarker;
    });

    if (newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }

    // 여러 노드 → bounds 자동 조정
    if (validNodes.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      validNodes.forEach(n => bounds.extend(new kakao.maps.LatLng(n.lat!, n.lng!)));
      map.setBounds(bounds);
    }
  }, [geoNodes, sdkReady]);

  // 경로(폴리라인) 렌더링
  const drawRoute = useCallback((route: RouteData) => {
    if (!sdkReady || !mapInstanceRef.current) return;
    const kakao = window.kakao;
    const map = mapInstanceRef.current;

    const path: KakaoLatLng[] = [
      new kakao.maps.LatLng(route.from.lat, route.from.lng),
      ...(route.waypoints ?? []).map(w => new kakao.maps.LatLng(w.lat, w.lng)),
      ...(route.current ? [new kakao.maps.LatLng(route.current.lat, route.current.lng)] : []),
      new kakao.maps.LatLng(route.to.lat, route.to.lng),
    ];

    if (polylineRef.current) {
      polylineRef.current.setPath(path);
    } else {
      polylineRef.current = new kakao.maps.Polyline({
        map,
        path,
        strokeWeight: 3,
        strokeColor: '#8b8b8b',
        strokeOpacity: 0.7,
        strokeStyle: 'solid',
      });
    }
  }, [sdkReady]);
  void drawRoute; // 외부에서 props로 route 전달 시 활용

  // 실시간 위치 업데이트 (tracking)
  const updateTracking = useCallback((lat: number, lng: number) => {
    if (!sdkReady || !mapInstanceRef.current) return;
    const kakao = window.kakao;
    const map = mapInstanceRef.current;
    const position = new kakao.maps.LatLng(lat, lng);

    if (trackingOverlayRef.current) {
      trackingOverlayRef.current.setPosition(position);
    } else {
      const el = document.createElement('div');
      el.innerHTML = makePinHTML(true);
      trackingOverlayRef.current = new kakao.maps.CustomOverlay({
        position,
        content: el,
        yAnchor: 1,
        zIndex: 10,
      });
      trackingOverlayRef.current.setMap(map);
    }

    map.setCenter(position);
  }, [sdkReady]);
  void updateTracking; // 외부에서 Supabase Realtime 연동 시 활용

  // 줌 컨트롤
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current as KakaoMap & { getLevel: () => number; setLevel: (l: number) => void };
    const current = map.getLevel();
    map.setLevel(direction === 'in' ? current - 1 : current + 1);
  }, []);

  // 내 위치
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const kakao = window.kakao;
      const latlng = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      mapInstanceRef.current!.setCenter(latlng);
    });
  }, []);

  // 장소 선택 확정
  const handlePlaceSelect = useCallback(async (nodeId: string, lat: number, lng: number, address: string, name: string) => {
    setSearchingNodeId(null);

    if (sdkReady && mapInstanceRef.current) {
      const kakao = window.kakao;
      const position = new kakao.maps.LatLng(lat, lng);
      const node = geoNodes.find(n => n.id === nodeId) ?? { id: nodeId, title: name, locationText: name, status: 'ok' as const, lat, lng, address };

      // 핀 오버레이
      const pinEl = document.createElement('div');
      pinEl.innerHTML = makePinHTML();
      const pinOverlay = new kakao.maps.CustomOverlay({ position, content: pinEl, yAnchor: 1, zIndex: 3 });
      pinOverlay.setMap(mapInstanceRef.current);

      // 카드
      const updatedNode = { ...node, lat, lng, address, locationText: name, status: 'ok' as const };
      const cardEl = document.createElement('div');
      cardEl.innerHTML = makeCardHTML(updatedNode);
      const cardOverlay = new kakao.maps.CustomOverlay({ position, content: cardEl, yAnchor: 1, zIndex: 4 });
      cardEl.querySelector(`[data-close="${nodeId}"]`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        cardOverlay.setMap(null);
        openCardRef.current = null;
      });
      pinEl.addEventListener('click', () => {
        if (openCardRef.current && openCardRef.current !== cardOverlay) openCardRef.current.setMap(null);
        if (openCardRef.current === cardOverlay) { cardOverlay.setMap(null); openCardRef.current = null; }
        else { cardOverlay.setMap(mapInstanceRef.current!); openCardRef.current = cardOverlay; }
      });

      mapInstanceRef.current.setCenter(position);
    }

    setGeoNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, status: 'ok', lat, lng, address, locationText: name } : n
    ));

    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      await fetch(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_data: { ...targetNode.domain_data, location: name, address, lat, lng },
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
  const mapHeight = inline ? 200 : '100%';
  const mapMinHeight = inline ? undefined : 360;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: inline ? 'auto' : '100%' }}>
      {/* 지도 */}
      <div style={{ position: 'relative', width: '100%', height: mapHeight, minHeight: mapMinHeight, borderRadius: 'var(--ou-radius-md)', overflow: 'hidden', flexShrink: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--ou-bg)', opacity: 0.9,
            fontSize: 12, color: 'var(--ou-text-muted)',
          }}>
            지도 불러오는 중…
          </div>
        )}

        {/* OU 커스텀 컨트롤 */}
        {!inline && !isLoading && (
          <div className="ou-map-control" style={{ bottom: 16, right: 16 }}>
            <button className="ou-map-control-btn" onClick={() => handleZoom('in')} aria-label="줌 인">
              <Plus size={14} />
            </button>
            <button className="ou-map-control-btn" onClick={() => handleZoom('out')} aria-label="줌 아웃">
              <Minus size={14} />
            </button>
            <button className="ou-map-control-btn" onClick={handleMyLocation} aria-label="내 위치" style={{ marginTop: 4 }}>
              <Crosshair size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 위치 확인 필요 목록 */}
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
