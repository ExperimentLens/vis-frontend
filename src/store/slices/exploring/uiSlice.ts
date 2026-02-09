import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../listenerMiddleware';

interface UIState {
  mode: 'light' | 'dark';
}

const MODE_STORAGE_KEY = 'ui.mode';

const getSystemMode = (): UIState['mode'] => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialMode = (): UIState['mode'] => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);

  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  return getSystemMode();
};

const initialState: UIState = {
  mode: getInitialMode(),
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    resetUiState: () => {
      return initialState;
    },
    setMode: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mode = action.payload;
    },
  },
});

export const { resetUiState, setMode } = uiSlice.actions;

export const uiListeners = (startAppListening: AppStartListening) => {
  startAppListening({
    actionCreator: setMode,
    effect: action => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, action.payload);
      } catch {
        // Ignore storage errors (e.g. private mode or disabled storage)
      }
    },
  });
};
