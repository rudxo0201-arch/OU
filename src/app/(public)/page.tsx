'use client';

import Link from 'next/link';
import { DotSphere } from '@/components/landing/DotSphere';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ou-bg)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--ou-bg)',
      }}>
        <span style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 15, fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--ou-text-bright)',
        }}>
          OU
        </span>
      </nav>

      {/* Hero */}
      <div style={{
        minHeight: 'calc(100vh - 56px)',
        background: 'var(--ou-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: 40, overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 0.8px, transparent 0.8px)',
          backgroundSize: '32px 32px', opacity: 0.5, pointerEvents: 'none',
        }} />

        {/* 640px raised outer halo */}
        <div style={{
          position: 'absolute', width: 640, height: 640, borderRadius: '50%',
          background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* 520px pressed inner */}
          <div style={{
            width: 520, height: 520, borderRadius: '50%',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-lg)',
          }} />
        </div>

        {/* DotSphere at 40% opacity */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: 0.4, mixBlendMode: 'multiply',
        }}>
          <div style={{ width: 420, height: 420 }}>
            <DotSphere />
          </div>
        </div>

        {/* Content */}
        <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--ou-font-logo)', fontWeight: 600,
            fontSize: 'clamp(48px, 8vw, 64px)', color: 'var(--ou-text-bright)',
            letterSpacing: '0.02em',
          }}>
            Just talk.
          </div>
          <div style={{
            fontFamily: 'var(--ou-font-logo)', fontSize: 13,
            color: 'var(--ou-text-dimmed)', letterSpacing: '0.28em',
            textTransform: 'lowercase', marginTop: 14,
          }}>
            own universe
          </div>
          <div style={{
            marginTop: 32, fontSize: 16,
            color: 'var(--ou-text-body)', lineHeight: 1.6,
            maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
          }}>
            대화로 만드는 나만의 우주.<br />말하세요. OU가 기록하고, 정리합니다.
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '13px 30px', borderRadius: 999,
                fontFamily: 'var(--ou-font-logo)', fontSize: 13, fontWeight: 500,
                background: 'var(--ou-bg)', border: 'none',
                boxShadow: 'var(--ou-neu-raised-sm)',
                color: 'var(--ou-text-strong)', cursor: 'pointer',
              }}>
                Log in
              </button>
            </Link>
            <Link href="/login?tab=signup" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '13px 30px', borderRadius: 999,
                fontFamily: 'var(--ou-font-logo)', fontSize: 13, fontWeight: 600,
                background: 'var(--ou-bg)', border: 'none',
                boxShadow: 'var(--ou-neu-raised-md), inset 0 0 0 1.5px color-mix(in srgb, var(--ou-accent) 60%, transparent)',
                color: 'var(--ou-text-bright)', cursor: 'pointer',
              }}>
                sign up
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
