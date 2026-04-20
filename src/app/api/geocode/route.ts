import { NextRequest, NextResponse } from 'next/server';
import { getCachedResponse, setCachedResponse } from '@/lib/cache/redis';

const CACHE_TTL = 60 * 60 * 24 * 30; // 30일 (장소명은 거의 안 바뀜)

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const cacheKey = `geocode:${query}`;

  // 캐시 확인
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const restKey = process.env.KAKAO_REST_API_KEY;
  if (!restKey) {
    return NextResponse.json({ error: 'KAKAO_REST_API_KEY not set' }, { status: 500 });
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Kakao API error' }, { status: 502 });
    }

    const data = await res.json();
    const doc = data?.documents?.[0];

    if (!doc) {
      // 키워드 검색 실패 → 주소 검색으로 재시도
      const addrUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`;
      const addrRes = await fetch(addrUrl, {
        headers: { Authorization: `KakaoAK ${restKey}` },
      });
      const addrData = await addrRes.json();
      const addrDoc = addrData?.documents?.[0];

      if (!addrDoc) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }

      const result = {
        lat: parseFloat(addrDoc.y),
        lng: parseFloat(addrDoc.x),
        address: addrDoc.address_name,
        name: query,
      };
      await setCachedResponse(cacheKey, JSON.stringify(result), CACHE_TTL);
      return NextResponse.json(result);
    }

    const result = {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      address: doc.road_address_name || doc.address_name,
      name: doc.place_name || query,
    };

    await setCachedResponse(cacheKey, JSON.stringify(result), CACHE_TTL);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'geocode failed' }, { status: 500 });
  }
}
