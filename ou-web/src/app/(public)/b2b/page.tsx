'use client';

import { useState } from 'react';
import {
  Check, Buildings, ArrowRight, GraduationCap, Chalkboard,
  Briefcase, EnvelopeSimple, X,
} from '@phosphor-icons/react';
import Link from 'next/link';

// ── Feature comparison table ──
const PLAN_FEATURES = [
  { name: '데이터 저장', free: '100개', pro: '무제한', team: '무제한' },
  { name: '보기 방식', free: '기본 3종', pro: '전체', team: '전체 + 맞춤' },
  { name: '파일 업로드', free: '월 10건', pro: '무제한', team: '무제한' },
  { name: '공유 기능', free: '읽기 전용', pro: '읽기/쓰기', team: '팀 전체' },
  { name: '그룹', free: '-', pro: '5개', team: '무제한' },
  { name: '멤버 관리', free: '-', pro: '-', team: '관리자 권한' },
  { name: '학습 현황 분석', free: '-', pro: '기본', team: '상세 분석' },
  { name: '자동 업데이트 배포', free: '-', pro: '-', team: '지원' },
  { name: '전용 지원', free: '-', pro: '이메일', team: '전담 담당자' },
];

// ── Use case scenarios ──
const USE_CASES = [
  {
    icon: Chalkboard,
    title: '학원',
    subtitle: '강사 콘텐츠를 학생이 바로 활용',
    steps: [
      { label: '강사', desc: '수업 내용을 대화로 정리' },
      { label: '자동 변환', desc: '요약, 퀴즈, 플래시카드 생성' },
      { label: '학생 구독', desc: '수강생이 강사 자료를 구독' },
      { label: '시험 대비', desc: '오답 노트와 복습 자동 생성' },
    ],
    result: '강사는 수업에만 집중, 학생은 최신 자료로 복습',
  },
  {
    icon: GraduationCap,
    title: '대학교',
    subtitle: '강의를 놓쳐도 기록은 남아요',
    steps: [
      { label: '녹음', desc: '강의를 녹음하거나 텍스트 입력' },
      { label: '자동 정리', desc: '핵심 내용만 구조화' },
      { label: '공유', desc: '같은 수업 친구들과 자료 공유' },
      { label: '시험 준비', desc: '전체 강의 내용을 한눈에 복습' },
    ],
    result: '수업 내용이 자동으로 쌓이는 나만의 학습 아카이브',
  },
  {
    icon: Briefcase,
    title: '기업',
    subtitle: '회의가 끝나면 할 일이 자동으로 정리',
    steps: [
      { label: '회의', desc: '회의 내용을 대화로 기록' },
      { label: '자동 추출', desc: '할 일과 결정 사항 분리' },
      { label: '칸반 보기', desc: '팀 업무를 보드로 관리' },
      { label: '진행 추적', desc: '누가 뭘 했는지 한눈에 확인' },
    ],
    result: '회의록이 곧 업무 관리 도구가 되는 경험',
  },
];

const FEATURES = [
  '수업 자료를 한 번 수정하면 전원에게 자동 반영',
  '개인별 이해도를 한눈에 확인',
  '공동 과제와 프로젝트 관리',
  '오답 기록을 자동으로 정리',
  '취약한 부분을 시각적으로 파악',
  '어떤 언어로든 사용 가능',
];

const SCENARIOS = [
  {
    title: '학년 그룹 운영',
    before: '과대 -> 시간표 이미지 카톡 공지 -> 학생들 저장 -> 못 찾음 -> 반복',
    after: '과대 -> 시간표 한 번 수정 -> 학생 50명 자동 업데이트',
  },
  {
    title: '시험 대비',
    before: '교사 -> 요약 프린트 배포 -> 오류 발견 -> 다시 인쇄 -> 재배포',
    after: '교사 -> 요약 수정 1번 -> 구독 전원 즉시 최신본 확인',
  },
];

export default function B2BPage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    organization: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);

  const handleSubmitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/b2b/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        setSubmitResult('success');
        setContactForm({ name: '', organization: '', email: '', message: '' });
      } else {
        setSubmitResult('error');
      }
    } catch {
      setSubmitResult('error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitResult(null), 5000);
    }
  };

  const canSubmit = contactForm.name.trim() && contactForm.email.trim() && contactForm.message.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 60, maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {/* Notification */}
      {submitResult && (
        <div
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 360,
            padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {submitResult === 'success' ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: 14, flex: 1 }}>
            {submitResult === 'success'
              ? '문의가 접수되었어요. 빠르게 연락드릴게요!'
              : '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.'}
          </span>
          <button onClick={() => setSubmitResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '24px 0' }}>
        <Buildings size={48} weight="light" color="#9ca3af" />
        <h1 style={{ margin: 0, fontSize: 32 }}>조직을 위한 OU Team</h1>
        <span style={{ color: 'var(--color-dimmed)', fontSize: 18, maxWidth: 500, lineHeight: 1.7 }}>
          대화로 쌓은 지식이 조직의 자산이 됩니다.
          모든 구성원이 항상 최신 자료를 확인하고,
          관리자는 전체 현황을 한눈에 파악합니다.
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={() => {
              document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ padding: '12px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16 }}
          >
            도입 문의하기
          </button>
          <Link
            href="/login"
            style={{ padding: '12px 24px', background: '#f3f4f6', color: '#1a1a1a', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, textDecoration: 'none' }}
          >
            먼저 체험해보기
          </Link>
        </div>
      </div>

      {/* Features */}
      <div>
        <span style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>주요 기능</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {FEATURES.map(f => (
            <div key={f} style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ marginTop: 2 }}>
                  <Check size={16} weight="bold" color="#9ca3af" />
                </div>
                <span style={{ fontSize: 14, lineHeight: 1.5 }}>{f}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Case Scenarios */}
      <div>
        <span style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 8 }}>이런 곳에서 쓰고 있어요</span>
        <span style={{ fontSize: 14, color: 'var(--color-dimmed)', display: 'block', marginBottom: 16 }}>
          다양한 조직에서 OU Team을 활용하는 방법
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <div key={uc.title} style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Icon size={24} weight="light" />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>{uc.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>{uc.subtitle}</span>
                  </div>
                </div>

                {/* Step flow */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {uc.steps.map((step, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: '50%', background: '#f3f4f6', color: '#6b7280' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{step.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-dimmed)', lineHeight: 1.5 }}>
                        {step.desc}
                      </span>
                    </div>
                  ))}
                </div>

                <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: '0 0 8px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRight size={14} color="#9ca3af" />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{uc.result}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Before/After Scenarios */}
      <div>
        <span style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>이렇게 달라져요</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SCENARIOS.map(scenario => (
            <div key={scenario.title} style={{ padding: 20 }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>{scenario.title}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>기존 방식</span>
                  <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>{scenario.before}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />
                <div>
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>OU Team</span>
                  <span style={{ fontSize: 14 }}>{scenario.after}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Comparison Table */}
      <div>
        <span style={{ fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 16 }}>요금제 비교</span>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', minWidth: 140, borderBottom: '1px solid #e5e7eb' }}>기능</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', minWidth: 100, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>Free</span>
                    <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>무료</span>
                  </div>
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', minWidth: 100, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>Pro</span>
                    <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>월 9,900원</span>
                  </div>
                </th>
                <th style={{ textAlign: 'center', padding: '12px 16px', minWidth: 100, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>Team</span>
                    <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>문의</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map(f => (
                <tr key={f.name}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <span>{f.name}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: f.free === '-' ? 'var(--color-dimmed)' : undefined }}>
                    {f.free}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: f.pro === '-' ? 'var(--color-dimmed)' : undefined }}>
                    {f.pro}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>
                    {f.team}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Form */}
      <div style={{ padding: 24 }} id="contact-form">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EnvelopeSimple size={20} weight="light" />
            <span style={{ fontWeight: 600, fontSize: 18 }}>도입 문의</span>
          </div>
          <span style={{ fontSize: 14, color: 'var(--color-dimmed)' }}>
            아래 양식을 작성하시면 담당자가 빠르게 연락드립니다.
          </span>

          <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>이름 *</label>
              <input
                placeholder="홍길동"
                value={contactForm.name}
                onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>소속</label>
              <input
                placeholder="학교/학원/기업명"
                value={contactForm.organization}
                onChange={e => setContactForm(prev => ({ ...prev, organization: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>이메일 *</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={contactForm.email}
              onChange={e => setContactForm(prev => ({ ...prev, email: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>문의 내용 *</label>
            <textarea
              placeholder="도입을 고려하시는 이유, 예상 인원 수, 궁금한 점 등을 자유롭게 적어주세요."
              rows={4}
              value={contactForm.message}
              onChange={e => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <button
            onClick={handleSubmitContact}
            disabled={submitting || !canSubmit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6,
              cursor: submitting || !canSubmit ? 'default' : 'pointer', fontSize: 14,
              opacity: submitting || !canSubmit ? 0.5 : 1,
            }}
          >
            {submitting ? '...' : '문의 보내기'} {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>지금 도입을 시작해보세요</h3>
          <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>
            5명 이상 팀이라면 무료 체험이 가능합니다.
          </span>
          <button
            onClick={() => {
              document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
            }}
          >
            도입 문의 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
