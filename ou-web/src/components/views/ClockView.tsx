'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ViewProps } from './registry';

const CX = 100;
const CY = 100;
const R = 90;

function getHandCoords(cx: number, cy: number, angle: number, length: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + length * Math.cos(rad), y: cy + length * Math.sin(rad) };
}

function formatDigital(d: Date) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDate(d: Date) {
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}월 ${date}일 ${days[d.getDay()]}요일`;
}

function getTimeInTimezone(tz: string): Date {
  try {
    const str = new Date().toLocaleString('en-US', { timeZone: tz });
    return new Date(str);
  } catch {
    return new Date();
  }
}

interface ClockFaceProps {
  time: Date;
  label?: string;
  size?: number;
}

function ClockFace({ time, label, size = 200 }: ClockFaceProps) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  const hourEnd = getHandCoords(CX, CY, hourAngle, 50);
  const minuteEnd = getHandCoords(CX, CY, minuteAngle, 68);
  const secondEnd = getHandCoords(CX, CY, secondAngle, 76);

  const scale = size / 200;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          style={{ display: 'block' }}
        >
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--ou-border, #333)"
            strokeWidth={0.5}
          />

          {Array.from({ length: 60 }, (_, i) => {
            const angle = i * 6;
            const isMajor = i % 5 === 0;
            const outerR = R - 4;
            const innerR = isMajor ? R - 14 : R - 8;
            const start = getHandCoords(CX, CY, angle, innerR);
            const end = getHandCoords(CX, CY, angle, outerR);
            return (
              <line
                key={i}
                x1={start.x} y1={start.y}
                x2={end.x} y2={end.y}
                stroke={isMajor
                  ? 'var(--ou-gray-5, #888)'
                  : 'var(--ou-gray-3, #ccc)'}
                strokeWidth={isMajor ? 1.5 : 0.5}
                strokeLinecap="round"
              />
            );
          })}

          {Array.from({ length: 12 }, (_, i) => {
            const num = i === 0 ? 12 : i;
            const pos = getHandCoords(CX, CY, i * 30, R - 24);
            return (
              <text
                key={`n${i}`}
                x={pos.x} y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={500}
                fill="var(--ou-gray-5, #888)"
                style={{ fontFamily: "'Orbitron', var(--ou-font-logo, sans-serif)" }}
              >
                {num}
              </text>
            );
          })}

          <line
            x1={CX} y1={CY}
            x2={hourEnd.x} y2={hourEnd.y}
            stroke="var(--ou-gray-8, #333)"
            strokeWidth={3}
            strokeLinecap="round"
          />

          <line
            x1={CX} y1={CY}
            x2={minuteEnd.x} y2={minuteEnd.y}
            stroke="var(--ou-gray-6, #666)"
            strokeWidth={2}
            strokeLinecap="round"
          />

          <line
            x1={CX} y1={CY}
            x2={secondEnd.x} y2={secondEnd.y}
            stroke="var(--ou-gray-4, #aaa)"
            strokeWidth={0.8}
            strokeLinecap="round"
          />

          <circle
            cx={CX} cy={CY} r={3}
            fill="var(--ou-gray-6, #666)"
          />
        </svg>
      </div>

      <span
        style={{
          fontSize: 20 * scale,
          fontWeight: 400,
          textAlign: 'center',
          fontFamily: "'Orbitron', var(--ou-font-logo, sans-serif)",
          color: 'var(--ou-gray-8, #333)',
          letterSpacing: 2,
        }}
      >
        {formatDigital(time)}
      </span>

      <span
        style={{
          fontSize: 11 * scale,
          textAlign: 'center',
          color: 'var(--ou-gray-5, #888)',
        }}
      >
        {formatDate(time)}
      </span>

      {label && (
        <span
          style={{
            fontSize: 10 * scale,
            fontWeight: 500,
            textAlign: 'center',
            color: 'var(--ou-gray-4, #aaa)',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function ClockView({ nodes }: ViewProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timezones = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    return nodes
      .filter(n => n.domain_data?.timezone || n.domain_data?.city)
      .map(n => ({
        id: n.id,
        timezone: n.domain_data?.timezone ?? 'UTC',
        label: n.domain_data?.city ?? n.domain_data?.label ?? n.domain_data?.timezone ?? '',
      }));
  }, [nodes]);

  if (timezones.length > 0) {
    const cols = timezones.length <= 2 ? timezones.length : timezones.length <= 4 ? 2 : 3;
    const clockSize = timezones.length <= 2 ? 180 : 140;
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
          {timezones.map(tz => (
            <ClockFace
              key={tz.id}
              time={getTimeInTimezone(tz.timezone)}
              label={tz.label}
              size={clockSize}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 }}>
      <ClockFace time={now} size={200} />
    </div>
  );
}
