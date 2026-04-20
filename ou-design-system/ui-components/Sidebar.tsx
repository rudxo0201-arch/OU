'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Stack, Tooltip, UnstyledButton, Text, Box, Divider, ActionIcon, Group } from '@mantine/core';
import {
  Book,
  Leaf,
  MapPin,
  Flask,
  Cards,
  Question,
  ChartBar,
  GearSix,
  Gear,
  SignIn,
  SignOut,
  User,
  Moon,
  Sun,
  CaretLeft,
  CaretRight,
  Planet,
  GraduationCap,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationStore } from '@/stores/navigationStore';
import { useUniverseStore } from '@/stores/universeStore';
import { useDatasetConfigStore, type DatasetId } from '@/stores/datasetConfigStore';
import { useMantineColorScheme, Badge } from '@mantine/core';
import classes from './Sidebar.module.css';

interface NavSection {
  label: string;
  items: { id: string; label: string; icon: typeof Book; href: string; adminOnly?: boolean }[];
}

const sections: NavSection[] = [
  {
    label: 'My Universe',
    items: [
      { id: 'universe', label: 'My Universe', icon: Planet, href: '/home' },
    ],
  },
  {
    label: '사전',
    items: [
      { id: 'boncho', label: '본초', icon: Leaf, href: '/boncho' },
      { id: 'acupoint', label: '경혈', icon: MapPin, href: '/acupoint' },
      { id: 'prescription', label: '방제', icon: Flask, href: '/prescription' },
    ],
  },
  {
    label: 'Study',
    items: [
      { id: 'study', label: 'Study', icon: GraduationCap, href: '/study' },
    ],
  },
  {
    label: '학습',
    items: [
      { id: 'flashcard', label: '플래시카드', icon: Cards, href: '/flashcard' },
      { id: 'quiz', label: '퀴즈', icon: Question, href: '/quiz' },
      { id: 'stats', label: '통계', icon: ChartBar, href: '/stats' },
    ],
  },
];

const bottomItems = [
  { id: 'admin', label: '관리', icon: GearSix, href: '/admin', adminOnly: true },
];

const DATASET_IDS: DatasetId[] = ['dictionary', 'boncho', 'acupoint', 'prescription'];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAuth();
  const { sidebarExpanded, toggleSidebar } = useNavigationStore();
  const universeCount = useUniverseStore(s => s.items.length);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const datasetConfig = useDatasetConfigStore(s => s.config);
  const loadDatasetConfig = useDatasetConfigStore(s => s.load);

  // 앱 시작 시 데이터셋 설정 로드
  useEffect(() => { loadDatasetConfig(); }, [loadDatasetConfig]);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className={classes.sidebar} data-expanded={sidebarExpanded || undefined}>
      <Stack gap={0} h="100%">
        {/* Brand Area */}
        <UnstyledButton className={classes.brandArea} onClick={() => router.back()}>
          <Text className={classes.brandText} fw={500} fz={sidebarExpanded ? 20 : 14}>
            OU
          </Text>
          {sidebarExpanded && (
            <Text fz={8} c="dimmed" mt={2} style={{ letterSpacing: '3px' }}>
              OWN UNIVERSE
            </Text>
          )}
        </UnstyledButton>

        <Divider mx={sidebarExpanded ? 16 : 10} color="var(--mantine-color-default-border)" />

        {/* Nav Sections */}
        <Box style={{ flex: 1, overflowY: 'auto' }} py={8}>
          {sections.map((section) => {
            // 사전 섹션: 공개된 데이터셋만 표시
            const items = section.label === '사전'
              ? section.items.filter(item => DATASET_IDS.includes(item.id as DatasetId) ? datasetConfig[item.id as DatasetId] : true)
              : section.items;
            if (items.length === 0) return null;
            return (
            <div key={section.label} className={classes.section}>
              {sidebarExpanded && (
                <Text className={classes.sectionLabel}>{section.label}</Text>
              )}
              <Stack gap={2} px={sidebarExpanded ? 8 : 10}>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Tooltip
                      key={item.id}
                      label={item.label}
                      position="right"
                      withArrow
                      disabled={sidebarExpanded}
                    >
                      <UnstyledButton
                        className={classes.navButton}
                        data-active={active || undefined}
                        data-expanded={sidebarExpanded || undefined}
                        onClick={() => router.push(item.href)}
                      >
                        <Icon size={20} weight={active ? 'fill' : 'light'} />
                        {sidebarExpanded && (
                          <Group gap={6} style={{ flex: 1 }}>
                            <Text fz={13} fw={active ? 500 : 400} ml={10}>
                              {item.label}
                            </Text>
                            {item.id === 'universe' && universeCount > 0 && (
                              <Badge size="xs" variant="filled" color="dark" radius="xl" ml="auto">
                                {universeCount}
                              </Badge>
                            )}
                          </Group>
                        )}
                      </UnstyledButton>
                    </Tooltip>
                  );
                })}
              </Stack>
            </div>
            );
          })}
        </Box>

        {/* Bottom Area */}
        <Divider mx={sidebarExpanded ? 16 : 10} color="var(--mantine-color-default-border)" />
        <Stack gap={2} px={sidebarExpanded ? 8 : 10} py={8}>
          {/* Color scheme toggle */}
          <Tooltip label={colorScheme === 'dark' ? '라이트 모드' : '다크 모드'} position="right" withArrow disabled={sidebarExpanded}>
            <UnstyledButton
              className={classes.navButton}
              data-expanded={sidebarExpanded || undefined}
              onClick={() => toggleColorScheme()}
            >
              {colorScheme === 'dark' ? <Sun size={20} weight="light" /> : <Moon size={20} weight="light" />}
              {sidebarExpanded && (
                <Text fz={13} ml={10}>
                  {colorScheme === 'dark' ? '라이트 모드' : '다크 모드'}
                </Text>
              )}
            </UnstyledButton>
          </Tooltip>

          {/* Admin */}
          {isAdmin && bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Tooltip key={item.id} label={item.label} position="right" withArrow disabled={sidebarExpanded}>
                <UnstyledButton
                  className={classes.navButton}
                  data-active={active || undefined}
                  data-expanded={sidebarExpanded || undefined}
                  onClick={() => router.push(item.href)}
                >
                  <Icon size={20} weight={active ? 'fill' : 'light'} />
                  {sidebarExpanded && (
                    <Text fz={13} fw={active ? 500 : 400} ml={10}>
                      {item.label}
                    </Text>
                  )}
                </UnstyledButton>
              </Tooltip>
            );
          })}

          {/* Settings — logged-in users */}
          {user && (
            <Tooltip label="설정" position="right" withArrow disabled={sidebarExpanded}>
              <UnstyledButton
                className={classes.navButton}
                data-active={pathname.startsWith('/settings') || undefined}
                data-expanded={sidebarExpanded || undefined}
                onClick={() => router.push('/settings')}
              >
                <Gear size={20} weight={pathname.startsWith('/settings') ? 'fill' : 'light'} />
                {sidebarExpanded && (
                  <Text fz={13} fw={pathname.startsWith('/settings') ? 500 : 400} ml={10}>
                    설정
                  </Text>
                )}
              </UnstyledButton>
            </Tooltip>
          )}

          {/* Auth */}
          {user ? (
            <Tooltip label="로그아웃" position="right" withArrow disabled={sidebarExpanded}>
              <UnstyledButton
                className={classes.navButton}
                data-expanded={sidebarExpanded || undefined}
                onClick={() => signOut().then(() => router.push('/'))}
              >
                <SignOut size={20} weight="light" />
                {sidebarExpanded && <Text fz={13} ml={10}>로그아웃</Text>}
              </UnstyledButton>
            </Tooltip>
          ) : (
            <Tooltip label="로그인" position="right" withArrow disabled={sidebarExpanded}>
              <UnstyledButton
                className={classes.navButton}
                data-expanded={sidebarExpanded || undefined}
                data-active={pathname === '/login' || undefined}
                onClick={() => router.push('/login')}
              >
                <SignIn size={20} weight="light" />
                {sidebarExpanded && <Text fz={13} ml={10}>로그인</Text>}
              </UnstyledButton>
            </Tooltip>
          )}

          {/* Collapse toggle */}
          <Tooltip label={sidebarExpanded ? '사이드바 접기' : '사이드바 펼치기'} position="right" withArrow disabled={sidebarExpanded}>
            <UnstyledButton
              className={classes.navButton}
              data-expanded={sidebarExpanded || undefined}
              onClick={toggleSidebar}
            >
              {sidebarExpanded ? <CaretLeft size={20} weight="light" /> : <CaretRight size={20} weight="light" />}
              {sidebarExpanded && <Text fz={13} ml={10}>접기</Text>}
            </UnstyledButton>
          </Tooltip>
        </Stack>
      </Stack>
    </nav>
  );
}
