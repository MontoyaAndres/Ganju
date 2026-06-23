import type { ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mirrors apps/web/src/theme.ts so @ganju/ui islands inherit the same custom
// theme keys (theme.colors / theme.fonts) their Emotion styles rely on.
const basicConfig = {
  colors: {
    transparent: 'transparent',
    black: '#000000',
    bastille: '#1C1825',
    white: '#FFFFFF',
    red: '#FF0000',
    alto: '#D4D4D4',
    fernGreen: '#417741',
    saltBox: '#6E6B73',
    peppermint: '#E8F5E9',
    parsley: '#1B5E20',
    japaneseLaurel: '#2E7D32',
    earlyDawn: '#FFF8E1',
    romanCoffee: '#795548',
    tahitiGold: '#F57C00',
    thunderbird: '#C62828',
    fairPink: '#FFEBEE',
    salem: '#1F7A3A'
  },
  fonts: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '26px',
    '4xl': '34px',
    '5xl': '40px',
    '6xl': '60px',
    '7xl': '70px',
    '8xl': '90px',
    '9xl': '100px'
  },
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

const theme = createTheme({
  ...basicConfig,
  palette: {
    primary: { main: '#1C1825' },
    secondary: { main: '#FFFFFF' }
  },
  typography: { fontFamily: 'Fustat, sans-serif' }
});

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
