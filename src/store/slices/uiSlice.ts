import { createSlice } from '@reduxjs/toolkit';
import type { ThemeMode } from '../../mui-theme';

const getInitialThemeMode = (): ThemeMode => {
  const stored = localStorage.getItem('themeMode');
  return stored === 'dark' ? 'dark' : 'light';
};

interface UIState {
  themeMode: ThemeMode;
}

const initialState: UIState = {
  themeMode: getInitialThemeMode(),
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleThemeMode: state => {
      const next: ThemeMode = state.themeMode === 'light' ? 'dark' : 'light';
      state.themeMode = next;
      localStorage.setItem('themeMode', next);
    },
  },
});

export const { toggleThemeMode } = uiSlice.actions;
