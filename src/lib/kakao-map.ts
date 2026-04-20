// 카카오맵 SDK 타입 선언 + 동적 로드 유틸
// JavaScript 키는 NEXT_PUBLIC_KAKAO_MAP_KEY (도메인 제한으로 보호)

declare global {
  interface Window {
    kakao: KakaoMaps;
  }
}

export interface KakaoPlaceResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  category_name: string;
}

export interface KakaoCustomOverlayOptions {
  position: KakaoLatLng;
  content: string | HTMLElement;
  map?: KakaoMap;
  zIndex?: number;
  yAnchor?: number;
  xAnchor?: number;
}

export interface KakaoCustomOverlay {
  setMap: (map: KakaoMap | null) => void;
  getPosition: () => KakaoLatLng;
  setContent: (content: string | HTMLElement) => void;
  setPosition: (position: KakaoLatLng) => void;
}

export interface KakaoPolylineOptions {
  map?: KakaoMap;
  path: KakaoLatLng[];
  strokeWeight?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeStyle?: string;
}

export interface KakaoPolyline {
  setMap: (map: KakaoMap | null) => void;
  setPath: (path: KakaoLatLng[]) => void;
  getPath: () => KakaoLatLng[];
}

export interface KakaoClustererOptions {
  map: KakaoMap;
  averageCenter?: boolean;
  minLevel?: number;
  disableClickZoom?: boolean;
  calculator?: number[];
  styles?: Record<string, string>[];
}

export interface KakaoClusterer {
  addMarkers: (markers: KakaoMarker[], redraw?: boolean) => void;
  removeMarkers: (markers: KakaoMarker[], redraw?: boolean) => void;
  clear: () => void;
  redraw: () => void;
}

export interface KakaoMaps {
  maps: {
    load: (callback: () => void) => void;
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
    Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
    CustomOverlay: new (options: KakaoCustomOverlayOptions) => KakaoCustomOverlay;
    InfoWindow: new (options: KakaoInfoWindowOptions) => KakaoInfoWindow;
    Polyline: new (options: KakaoPolylineOptions) => KakaoPolyline;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoBounds;
    event: {
      addListener: (target: unknown, type: string, handler: () => void) => void;
    };
    services: {
      Places: new () => {
        keywordSearch: (
          keyword: string,
          callback: (result: KakaoPlaceResult[], status: string) => void
        ) => void;
      };
      Status: {
        OK: string;
        ZERO_RESULT: string;
        ERROR: string;
      };
    };
    MarkerClusterer: new (options: KakaoClustererOptions) => KakaoClusterer;
  };
}

export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
}

export interface KakaoMarkerOptions {
  map?: KakaoMap;
  position: KakaoLatLng;
  title?: string;
}

export interface KakaoInfoWindowOptions {
  content: string;
  removable?: boolean;
}

export interface KakaoMap {
  setCenter: (latlng: KakaoLatLng) => void;
  setBounds: (bounds: KakaoBounds) => void;
  relayout: () => void;
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  getPosition: () => KakaoLatLng;
}

export interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoBounds {
  extend: (latlng: KakaoLatLng) => void;
}

let sdkLoaded = false;
let sdkLoading = false;
const callbacks: (() => void)[] = [];

export function loadKakaoMapSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && window.kakao?.maps) {
      resolve();
      return;
    }

    callbacks.push(resolve);

    if (sdkLoading) return;
    sdkLoading = true;

    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!key) {
      reject(new Error('NEXT_PUBLIC_KAKAO_MAP_KEY is not set'));
      return;
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services,clusterer&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        sdkLoaded = true;
        sdkLoading = false;
        callbacks.forEach((cb) => cb());
        callbacks.length = 0;
      });
    };

    script.onerror = () => {
      sdkLoading = false;
      reject(new Error('Failed to load Kakao Maps SDK'));
    };

    document.head.appendChild(script);
  });
}
