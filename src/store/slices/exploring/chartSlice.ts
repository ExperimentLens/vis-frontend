import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AggregateFunctionType } from '../../../shared/models/exploring/enum/aggregate-function-type.model';
import type { AppStartListening } from '../../listenerMiddleware';
import { executeQuery, setCategoricalFilters } from './datasetSlice';
import { updateAnalysisResults } from './statsSlice';
import { shallowEqual } from 'react-redux';
import type { IVisQueryResults } from '../../../shared/models/exploring/vis-query-results.model';
import { logger } from '../../../shared/utils/logger';
import { getRectAndFeatureToUse } from '../../../shared/utils/mapUtils';

interface ChartState {
  groupByCols: string[];
  measureCol: string | null;
  aggType: AggregateFunctionType;
  chartType: string;
}

const initialState: ChartState = {
  groupByCols: [],
  measureCol: null,
  aggType: 'COUNT',
  chartType: 'column',
};

export const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    resetChartState: () => {
      return initialState;
    },
    setAggType: (state, action: PayloadAction<AggregateFunctionType>) => {
      state.aggType = action.payload;
    },
    setChartType: (state, action: PayloadAction<string>) => {
      state.chartType = action.payload;
    },
    setGroupByCols: (state, action: PayloadAction<string[]>) => {
      state.groupByCols = action.payload;
    },
    setMeasureCol: (state, action: PayloadAction<string | null>) => {
      state.measureCol = action.payload;
    },
    triggerChartUpdate: () => {
      // No-op reducer: just used to trigger side effects via listeners
    },
  },
});

export const chartListeners = (startApplistening: AppStartListening) => {
  startApplistening({
    actionCreator: triggerChartUpdate,
    effect: async (_, { dispatch, getState }) => {
      const state = getState();
      const { groupByCols, measureCol, aggType } = state.chart;
      const { categoricalFilters } = state.dataset;
      const { zone } = state.zone;
      const { drawnShape, selectedGeohash, activeSelection } = state.map;
      const { viewRect } = state.map;
      const datasetId = state.dataset.dataset.id;

      if (datasetId) {
        const newFilters: Record<string, unknown> = {
          ...categoricalFilters,
        };

        groupByCols.forEach(col => delete newFilters[col]);

        const { rectToUse, featureToUse } = getRectAndFeatureToUse({
          activeSelection,
          drawnShape,
          selectedGeohashRect: selectedGeohash.rect,
          viewRect,
          zoneFeature: zone.feature ?? null,
        });

        const queryBody = {
          categoricalFilters:
            newFilters !== categoricalFilters
              ? newFilters
              : categoricalFilters,
          aggType,
          groupByCols,
          measureCol,
          feature: featureToUse,
          rect: rectToUse,
        };

        try {
          const action = await dispatch(executeQuery({ body: queryBody }));

          if (executeQuery.fulfilled.match(action)) {
            const result = action.payload as IVisQueryResults;

            dispatch(
              updateAnalysisResults({
                totalPointCount: result.pointCount,
                rectStats: result.rectStats,
                series: result.series,
              }),
            );
            if (!shallowEqual(newFilters, state.dataset.categoricalFilters)) {
              dispatch(setCategoricalFilters(newFilters));
            }
          }
        } catch (error) {
          logger.error(
            'Error executing query after triggerChartUpdate:',
            error,
          );
        }
      }
    },
  });
};

export const {
  resetChartState,
  setAggType,
  setChartType,
  setGroupByCols,
  setMeasureCol,
  triggerChartUpdate,
} = chartSlice.actions;
