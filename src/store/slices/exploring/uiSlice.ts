import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  mode: 'light' | 'dark';
}

const initialState: UIState = {
  mode: 'light',
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
