import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IRectStats } from '../../../shared/models/exploring/rect-stats.model';
import type { IGroupedStats } from '../../../shared/models/exploring/grouped-stats.model';

interface StatsState {
  totalPointCount: number;
  series: IGroupedStats[];
  rectStats: IRectStats | null;
}

const initialState: StatsState = {
  totalPointCount: 0,
  series: [],
  rectStats: null,
};

export const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    resetStatsState: () => {
      return initialState;
    },
    setTotalPointCount: (state, action: PayloadAction<number>) => {
      state.totalPointCount = action.payload;
    },
    setRectStats: (state, action: PayloadAction<IRectStats>) => {
      state.rectStats = action.payload;
    },
    setSeries: (state, action: PayloadAction<IGroupedStats[]>) => {
      state.series = action.payload;
    },
    updateAnalysisResults: (
      state,
      action: PayloadAction<{ totalPointCount: number; rectStats: IRectStats; series: IGroupedStats[] }>,
    ) => {
      const { totalPointCount, rectStats, series } = action.payload;

      state.totalPointCount = totalPointCount;
      state.rectStats = rectStats;
      state.series = series;
    },
  },
});

export const {
  resetStatsState,
  setTotalPointCount,
  setRectStats,
  setSeries,
  updateAnalysisResults,
} = statsSlice.actions;
