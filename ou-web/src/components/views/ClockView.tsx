'use client';

import { useState, useEffect, useMemo } from 'react';
import { Stack, Text, Box, SimpleGrid } from '@mantine/core';
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
    <Stack gap={8} align="center">
      <Box style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          style={{ display: 'block' }}
        >
          {/* 외곽 원 */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--ou-border-muted, var(--mantine-color-default-border))"
            strokeWidth={0.5}
          />

          {/* 눈금 */}
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
                  ? 'var(--ou-text-secondary, var(--mantine-color-gray-5))'
                  : 'var(--ou-text-muted, var(--mantine-color-gray-3))'}
                strokeWidth={isMajor ? 1.5 : 0.5}
                strokeLinecap="round"
              />
            );
          })}

          {/* 숫자 */}
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
                fill="var(--ou-text-secondary, var(--mantine-color-gray-5))"
                style={{ fontFamily: "'Orbitron', var(--ou-font-logo, sans-serif)" }}
              >
                {num}
              </text>
            );
          })}

          {/* 시침 */}
          <line
            x1={CX} y1={CY}
            x2={hourEnd.x} y2={hourEnd.y}
            stroke="var(--ou-text-strong, var(--mantine-color-gray-8))"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* 분침 */}
          <line
            x1={CX} y1={CY}
            x2={minuteEnd.x} y2={minuteEnd.y}
            stroke="var(--ou-text-body, var(--mantine-color-gray-6))"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* 초침 */}
          <line
            x1={CX} y1={CY}
            x2={secondEnd.x} y2={secondEnd.y}
            stroke="var(--ou-text-dimmed, var(--mantine-color-gray-4))"
            strokeWidth={0.8}
            strokeLinecap="round"
          />

          {/* 중심점 */}
          <circle
            cx={CX} cy={CY} r={3}
            fill="var(--ou-text-body, var(--mantine-color-gray-6))"
          />
        </svg>
      </Box>

      {/* 디지털 시각 */}
      <Text
        fz={20 * scale}
        fw={400}
        ta="center"
        style={{
          fontFamily: "'Orbitron', var(--ou-font-logo, sans-serif)",
          color: 'var(--ou-text-strong, var(--mantine-color-gray-8))',
          letterSpacing: 2,
        }}
      >
        {formatDigital(time)}
      </Text>

      {/* 날짜 */}
      <Text
        fz={11 * scale}
        ta="center"
        style={{ color: 'var(--ou-text-secondary, var(--mantine-color-gray-5))' }}
      >
        {formatDate(time)}
      </Text>

      {/* 라벨 (월드클록용) */}
      {label && (
        <Text
          fz={10 * scale}
          fw={500}
          ta="center"
          style={{
            color: 'var(--ou-text-dimmed, var(--mantine-color-gray-4))',
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
    </Stack>
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

  // 월드클록 모드
  if (timezones.length > 0) {
    const cols = timezones.length <= 2 ? timezones.length : timezones.length <= 4 ? 2 : 3;
    const clockSize = timezones.length <= 2 ? 180 : 140;
    return (
      <Box p="md">
        <SimpleGrid cols={cols} spacing="lg">
          {timezones.map(tz => (
            <ClockFace
              key={tz.id}
              time={getTimeInTimezone(tz.timezone)}
              label={tz.label}
              size={clockSize}
            />
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  // 기본: 로컬 시계 1개
  return (
    <Stack align="center" justify="center" p="md" gap="xs">
      <ClockFace time={now} size={200} />
    </Stack>
  );
}
