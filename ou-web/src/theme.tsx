'use client';
import { forwardRef } from 'react';
import { createTheme, Loader, MantineColorsTuple } from '@mantine/core';
import { OULoader } from '@/components/ui/OULoader';

const brand: MantineColorsTuple = [
  '#f5f5f5', '#e8e8e8', '#d1d1d1', '#a3a3a3', '#737373',
  '#525252', '#1a1a1a', '#141414', '#0a0a0a', '#000000',
];

const OUButtonLoader = forwardRef<HTMLDivElement, { size?: string | number }>(
  function OUButtonLoader({ size, ...rest }, ref) {
    const ouSize =
      (typeof size === 'number' && size <= 16) ? 'xs' as const :
      (typeof size === 'number' && size <= 24) ? 'sm' as const :
      (size === 'xs') ? 'xs' as const : 'sm' as const;
    return <div ref={ref} {...rest}><OULoader variant="star" size={ouSize} /></div>;
  },
);

export const theme = createTheme({
  fontFamily: '"Pretendard Variable", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand,
    dark: [
      '#C9C9C9', '#b8b8b8', '#828282', '#696969', '#424242',
      '#3b3b3b', '#2e2e2e', '#242424', '#1f1f1f', '#141414',
    ],
  },
  headings: { fontWeight: '600' },
  components: {
    ActionIcon: {
      defaultProps: { variant: 'subtle', color: 'gray' },
    },
    Paper: {
      defaultProps: { shadow: 'none' },
      styles: {
        root: { border: '0.5px solid var(--mantine-color-default-border)' },
      },
    },
    Loader: Loader.extend({
      defaultProps: {
        loaders: { ...Loader.defaultLoaders, ou: OUButtonLoader },
        type: 'ou',
      },
    }),
  },
});
