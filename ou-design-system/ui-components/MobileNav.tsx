'use client';

import { usePathname, useRouter } from 'next/navigation';
import { UnstyledButton, Text, Stack } from '@mantine/core';
import { Book, Leaf, MapPin, Flask, Planet, Cards, List } from '@phosphor-icons/react';
import { useNavigationStore } from '@/stores/navigationStore';
import classes from './MobileNav.module.css';

const mainTabs = [
  { id: 'universe', label: 'Universe', icon: Planet, href: '/explore' },
  { id: 'boncho', label: '본초', icon: Leaf, href: '/boncho' },
  { id: 'acupoint', label: '경혈', icon: MapPin, href: '/acupoint' },
  { id: 'flashcard', label: '학습', icon: Cards, href: '/flashcard' },
];

export function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { mobileMenuOpen, setMobileMenuOpen } = useNavigationStore();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className={classes.bottomBar}>
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <UnstyledButton
              key={tab.id}
              className={classes.tabButton}
              data-active={active || undefined}
              onClick={() => {
                router.push(tab.href);
                setMobileMenuOpen(false);
              }}
            >
              <Icon size={22} weight={active ? 'fill' : 'light'} />
              <Text fz={9} mt={2}>{tab.label}</Text>
            </UnstyledButton>
          );
        })}
        <UnstyledButton
          className={classes.tabButton}
          data-active={mobileMenuOpen || undefined}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <List size={22} weight="light" />
          <Text fz={9} mt={2}>더보기</Text>
        </UnstyledButton>
      </nav>

      {/* More Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className={classes.overlay} onClick={() => setMobileMenuOpen(false)} />
          <div className={classes.moreMenu}>
            <MoreMenuItem label="방제" icon={Flask} href="/prescription" active={isActive('/prescription')} onClick={() => { router.push('/prescription'); setMobileMenuOpen(false); }} />
            <MoreMenuItem label="퀴즈" icon={Cards} href="/quiz" active={isActive('/quiz')} onClick={() => { router.push('/quiz'); setMobileMenuOpen(false); }} />
            <MoreMenuItem label="통계" icon={Cards} href="/stats" active={isActive('/stats')} onClick={() => { router.push('/stats'); setMobileMenuOpen(false); }} />
          </div>
        </>
      )}
    </>
  );
}

function MoreMenuItem({ label, icon: Icon, active, onClick }: { label: string; icon: typeof Book; href: string; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton className={classes.moreItem} data-active={active || undefined} onClick={onClick}>
      <Icon size={20} weight={active ? 'fill' : 'light'} />
      <Text fz={13} ml={10}>{label}</Text>
    </UnstyledButton>
  );
}
