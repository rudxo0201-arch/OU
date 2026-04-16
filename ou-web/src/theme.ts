'use client';
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#f5f5f5', '#e8e8e8', '#d1d1d1', '#a3a3a3', '#737373',
  '#525252', '#1a1a1a', '#141414', '#0a0a0a', '#000000',
];

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
      styles: {
        root: {
          background: 'transparent',
          border: '0.5px solid var(--ou-border-subtle)',
          transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
          '&:hover': {
            borderColor: 'var(--ou-border-hover)',
            boxShadow: 'var(--ou-glow-sm)',
          },
        },
      },
    },
    Paper: {
      defaultProps: { shadow: 'none' },
      styles: {
        root: {
          background: 'transparent',
          border: '0.5px solid var(--ou-border-subtle)',
          boxShadow: 'var(--ou-glow-sm)',
        },
      },
    },
    Button: {
      styles: (theme: any, props: any) => ({
        root: props.variant === 'filled' ? {
          backgroundColor: 'var(--ou-text-strong)',
          color: 'var(--ou-space)',
          border: 'none',
          '&:hover': {
            backgroundColor: 'var(--ou-text-bright)',
          },
        } : {},
      }),
    },
    TextInput: {
      styles: {
        input: {
          background: 'transparent',
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-pill)',
          transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
          '&:focus': {
            borderColor: 'var(--ou-border-strong)',
            boxShadow: 'var(--ou-glow-md)',
          },
        },
      },
    },
    Modal: {
      styles: {
        content: {
          background: 'var(--ou-surface-faint)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-card)',
        },
        overlay: {
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        },
      },
    },
  },
});
