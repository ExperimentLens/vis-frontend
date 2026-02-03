// src/shared/components/app-theme-provider.tsx
import { ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';
import { useAppSelector } from './store/store';
import { createAppTheme } from './mui-theme';

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const mode = useAppSelector(state => state.ui.mode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
