'use client';

import { VIEW_REGISTRY, DOMAIN_VIEW_MAP } from '@/components/views/registry';

export function ViewSettings() {
  const registeredViews = Object.entries(VIEW_REGISTRY);
  const domainMaps = Object.entries(DOMAIN_VIEW_MAP);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* View Registry */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, marginTop: 0 }}>등록된 뷰 타입</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e0e0e0' }}>뷰 타입 ID</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e0e0e0' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {registeredViews.map(([key]) => (
              <tr key={key}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f3f5', fontFamily: 'monospace', fontSize: 12 }}>{key}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f3f5' }}>
                  <span style={{ background: '#343a40', color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>활성</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Domain → View Mapping */}
      <div style={{ padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, marginTop: 0 }}>도메인 → 기본 뷰 매핑</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e0e0e0' }}>도메인</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e0e0e0' }}>기본 뷰</th>
            </tr>
          </thead>
          <tbody>
            {domainMaps.map(([domain, view]) => (
              <tr key={domain}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f3f5' }}>
                  <span style={{ background: '#f1f3f5', padding: '1px 8px', borderRadius: 10, fontSize: 10 }}>{domain}</span>
                </td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f3f5', fontFamily: 'monospace', fontSize: 12 }}>{view}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <span style={{ fontSize: 12, color: '#868e96' }}>
        뷰 레지스트리는 코드에서 관리됩니다. 새 뷰를 추가하려면 registry.ts에 등록하세요.
      </span>
    </div>
  );
}
