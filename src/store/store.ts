import type { TypedUseSelectorHook } from 'react-redux';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { workflowPageSlice } from './slices/workflowPageSlice';
import { progressPageSlice } from './slices/progressPageSlice';
import { monitoringPageSlice } from './slices/monitorPageSlice';
import { authSlice } from './slices/authSlice';
import { experimentHighlightsSlice } from './slices/experimentHighlightsSlice';

export const store = configureStore({
  reducer: {
    workflowPage: workflowPageSlice.reducer,
    progressPage: progressPageSlice.reducer,
    monitorPage: monitoringPageSlice.reducer,
    auth: authSlice.reducer,
    experimentHighlights: experimentHighlightsSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
