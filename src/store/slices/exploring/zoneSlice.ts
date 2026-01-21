import {
  geoJsonPolygonToGeoPoints,
  geoJsonPolygonToRectangle,
  geometryToIncludedGeohashes,
  isAxisAlignedRectanglePolygon,
} from '../../../shared/utils/mapUtils';
import { api } from '../../../app/api/api';
import { setDrawnShape } from './mapSlice';
import { type RootState } from '../../store';
import { fetchColumnsValues } from './datasetSlice';
import {
  defaultValue as zoneDefaultValue,
  type IZone,
} from '../../../shared/models/exploring/zone.model';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../listenerMiddleware';
import { showError, showInfo, showSuccess } from '../../../shared/utils/toast';
import type { IDataset } from '../../../shared/models/exploring/dataset.model';
import type { IRectangle } from '../../../shared/models/exploring/rectangle.model';
import type { PayloadAction, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

/**
 * Fetches height/altitude values for a dataset within a specified rectangle
 * @param dataset - The dataset to fetch heights from
 * @param rectangle - The geographical rectangle to filter data
 * @param dispatch - Redux dispatch function
 * @returns Promise<number[] | undefined> - Array of heights or undefined if no height column found
 */
export const fetchHeightsForDataset = async (
  dataset: IDataset,
  rectangle: IRectangle,
  dispatch: ThunkDispatch<unknown, unknown, UnknownAction>,
): Promise<number[] | undefined> => {
  // Dynamically determine the altitude/height column name
  const altitudeColumn = dataset.originalColumns?.find(
    column =>
      column.name.toLowerCase() === 'height' ||
      column.name.toLowerCase() === 'altitude',
  )?.name;

  if (!altitudeColumn) {
    return undefined;
  }

  const response = await dispatch(
    fetchColumnsValues({
      datasetId: dataset.id!,
      columnNames: [altitudeColumn],
      rectangle: rectangle,
      latCol: dataset.originalColumns?.find(column =>
        column.name.toLowerCase().includes('lat'),
      )?.name,
      lonCol: dataset.originalColumns?.find(column =>
        column.name.toLowerCase().includes('lon'),
      )?.name,
    }),
  );

  if (
    response.payload &&
    typeof response.payload === 'object' &&
    altitudeColumn in response.payload
  ) {
    return (response.payload[altitudeColumn] as number[]) || [];
  }

  return undefined;
};

interface exploringZoneState {
  zone: IZone;
  zones: IZone[];
  modalOpen: boolean;
  loading: {
    getZones: boolean;
    getZone: boolean;
    postZone: boolean;
    putZone: boolean;
    deleteZone: boolean;
  };
  error: {
    getZones: string | null;
    getZone: string | null;
    postZone: string | null;
    putZone: string | null;
    deleteZone: string | null;
  };
}

const initialState: exploringZoneState = {
  zone: zoneDefaultValue,
  zones: [],
  modalOpen: false,
  loading: {
    getZones: false,
    getZone: false,
    postZone: false,
    putZone: false,
    deleteZone: false,
  },
  error: {
    getZones: null,
    getZone: null,
    postZone: null,
    putZone: null,
    deleteZone: null,
  },
};

export const getZones = createAsyncThunk<
  IZone[],
  void,
  { rejectValue: string }
>('api/getZones', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<IZone[]>('/zones');

    return response.data;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return rejectWithValue(errorMessage);
  }
});

export const getZonesByFileName = createAsyncThunk<
  IZone[],
  string,
  { rejectValue: string }
>('api/getZonesByFileName', async (fileName, { rejectWithValue }) => {
  try {
    const response = await api.get<IZone[]>(`/zones/file/${fileName}`);

    return response.data;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return rejectWithValue(errorMessage);
  }
});

export const postZone = createAsyncThunk<IZone, IZone, { rejectValue: string }>(
  'api/postZone',
  async (zone, { getState, dispatch, rejectWithValue }) => {
    const { dataset } = getState() as RootState;

    try {
      const includedGeohashes = geometryToIncludedGeohashes(zone.geometry, 8);

      // Heights API is still rectangle-based; use polygon bbox for now
      const rectangle =
        zone.geometry?.type === 'Polygon'
          ? geoJsonPolygonToRectangle(zone.geometry)
          : null;

      const heights = rectangle
        ? await fetchHeightsForDataset(dataset.dataset, rectangle, dispatch)
        : undefined;

      const response = await api.post<IZone>('/zones', {
        ...zone,
        geohashes: includedGeohashes,
        heights,
      });

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return rejectWithValue(errorMessage);
    }
  },
);

export const deleteZone = createAsyncThunk<
  void,
  { fileName: string; id: string },
  { rejectValue: string }
>('api/deleteZone', async ({ fileName, id }, { rejectWithValue }) => {
  try {
    await api.delete(`/zones/file/${fileName}/id/${id}`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return rejectWithValue(errorMessage);
  }
});

export const zoneSlice = createSlice({
  name: 'zone',
  initialState,
  reducers: {
    setZone: (state, action: PayloadAction<IZone>) => {
      state.zone = action.payload;
    },
    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.modalOpen = action.payload;
    },
    resetZoneState: () => {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      // getZones
      .addCase(getZones.pending, state => {
        state.loading.getZones = true;
      })
      .addCase(getZones.fulfilled, (state, action) => {
        state.loading.getZones = false;
        state.zones = action.payload;
      })
      .addCase(getZones.rejected, (state, action) => {
        state.loading.getZones = false;
        state.error.getZones = action.payload || 'Failed to get zones';
        showError(action.payload || 'Failed to get zones');
      })
      // getZonesByFileName
      .addCase(getZonesByFileName.pending, state => {
        state.loading.getZones = true;
      })
      .addCase(getZonesByFileName.fulfilled, (state, action) => {
        state.loading.getZones = false;
        state.zones = action.payload;
      })
      .addCase(getZonesByFileName.rejected, (state, action) => {
        state.loading.getZones = false;
        state.error.getZones =
          action.payload || 'Failed to get zones by file name';
        showError(action.payload || 'Failed to get zones by file name');
      })
      // postZone
      .addCase(postZone.pending, state => {
        state.loading.postZone = true;
        showInfo('Creating zone...');
      })
      .addCase(postZone.fulfilled, (state, action) => {
        state.loading.postZone = false;
        state.zone = action.payload;
        // state.zones.push(action.payload);
        state.modalOpen = true;
        showSuccess('Zone created successfully!');
      })
      .addCase(postZone.rejected, (state, action) => {
        state.loading.postZone = false;
        state.error.postZone = action.payload || 'Failed to post zone';
        showError(action.payload || 'Failed to post zone');
      })
      // deleteZone
      .addCase(deleteZone.pending, state => {
        state.loading.deleteZone = true;
      })
      .addCase(deleteZone.fulfilled, (state, action) => {
        state.loading.deleteZone = false;
        state.zones = state.zones.filter(
          zone => zone.id !== action.meta.arg.id,
        );
        showSuccess('Zone deleted successfully!');
      })
      .addCase(deleteZone.rejected, (state, action) => {
        state.loading.deleteZone = false;
        state.error.deleteZone = action.payload || 'Failed to delete zone';
        showError(action.payload || 'Failed to delete zone');
      });
  },
});

export const zoneListeners = (startAppListening: AppStartListening) => {
  // setZoneListener
  startAppListening({
    actionCreator: setZone,
    effect: async (action, { dispatch }) => {
      const { geometry } = action.payload;

      if (geometry?.type === 'Polygon') {
        // Treat axis-aligned 4-corner polygons as rectangles for nicer rendering,
        // otherwise render as polygon.
        if (isAxisAlignedRectanglePolygon(geometry)) {
          const rect = geoJsonPolygonToRectangle(geometry);

          if (rect) {
            dispatch(setDrawnShape({ kind: 'rectangle', rect }));

            return;
          }
        }

        const coordinates = geoJsonPolygonToGeoPoints(geometry);

        dispatch(setDrawnShape({ kind: 'polygon', coordinates }));
      } else {
        // Not supported yet (Point, etc.)
        dispatch(setDrawnShape(null));
      }
    },
  });
};

export const { setZone, setModalOpen, resetZoneState } = zoneSlice.actions;
