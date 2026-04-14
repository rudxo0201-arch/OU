'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

// OU Design System: Black & White, Modern, Futuristic
// Light: white bg, black components, subtle glow
// Dark: black bg (space), white components, glow
const brand: MantineColorsTuple = [
  '#f5f5f5',
  '#e8e8e8',
  '#d1d1d1',
  '#a3a3a3',
  '#737373',
  '#525252',
  '#1a1a1a', // 6 - primary
  '#141414',
  '#0a0a0a',
  '#000000',
];

export const theme = createTheme({
  fontFamily: '"Pretendard Variable", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand,
    dark: [
      '#C9C9C9',
      '#b8b8b8',
      '#828282',
      '#696969',
      '#424242',
      '#3b3b3b',
      '#2e2e2e',
      '#242424',
      '#1f1f1f',
      '#141414',
    ],
  },
  headings: {
    fontWeight: '600',
  },
  components: {
    ActionIcon: {
      defaultProps: {
        variant: 'subtle',
        color: 'gray',
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'none',
      },
      styles: {
        root: {
          border: '0.5px solid var(--mantine-color-default-border)',
        },
      },
    },
  },
});
