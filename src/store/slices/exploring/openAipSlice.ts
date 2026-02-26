import type { RootState } from '../../store';
import { openAipApi } from '../../../app/api/api';
import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { IOpenAipAirport } from '../../../shared/models/exploring/openaip/airport.model';
import type { IOpenAipAirspace } from '../../../shared/models/exploring/openaip/airspace.model';

type ViewportKey = string; // e.g. bbox rounded + zoom bucket

type OpenAipListResponse<T> = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  nextPage?: number;
  items: T[];
};

type FetchAllPagesParams = {
  endpoint: '/airports' | '/airspaces';
  params: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  maxPages?: number; // safety cap
};

async function fetchAllPages<T>({
  endpoint,
  params,
  signal,
  maxPages = 20,
}: FetchAllPagesParams): Promise<T[]> {
  const limit = Number(params.limit ?? 300);
  let page = 1;
  let pagesFetched = 0;
  const all: T[] = [];

  while (pagesFetched < maxPages) {
    const res = await openAipApi.get<OpenAipListResponse<T>>(endpoint, {
      params: { ...params, page, limit },
      signal,
    });

    all.push(...res.data.items);
    pagesFetched += 1;

    if (!res.data.nextPage) break;
    page = res.data.nextPage;
  }

  return all;
}

export const fetchAirportsByBBox = (bbox: string, signal?: AbortSignal) => {
  return fetchAllPages<IOpenAipAirport>({
    endpoint: '/airports',
    params: { bbox },
    signal,
  });
};

export const fetchAirspacesByBBox = (bbox: string, signal?: AbortSignal) => {
  return fetchAllPages<IOpenAipAirspace>({
    endpoint: '/airspaces',
    params: { bbox },
    signal,
  });
};

type FetchOpenAipForViewportArg = {
  bbox: string;
  viewportKey: ViewportKey;
};

type FetchOpenAipForViewportPayload = {
  viewportKey: ViewportKey;
  airports: IOpenAipAirport[];
  airspaces: IOpenAipAirspace[];
  fetchedAt: number;
};

export const fetchOpenAipForViewport = createAsyncThunk<
  FetchOpenAipForViewportPayload,
  FetchOpenAipForViewportArg,
  { state: RootState }
>(
  'openAip/fetchOpenAipForViewport',
  async ({ bbox, viewportKey }, thunkApi) => {
    const state = thunkApi.getState() as RootState;
    const { showAirports, showAirspaces } = state.openAip;

    const airportsPromise = showAirports
      ? fetchAirportsByBBox(bbox, thunkApi.signal)
      : Promise.resolve([] as IOpenAipAirport[]);
    const airspacesPromise = showAirspaces
      ? fetchAirspacesByBBox(bbox, thunkApi.signal)
      : Promise.resolve([] as IOpenAipAirspace[]);

    // Promise.all set of fetchAirportsByBBox and fetchAirspacesByBBox
    const [airports, airspaces] = await Promise.all([
      airportsPromise,
      airspacesPromise,
    ]);

    return { viewportKey, airports, airspaces, fetchedAt: Date.now() };
  },
  {
    condition: ({ viewportKey }, { getState }) => {
      const state = getState();
      const openAipState = state.openAip;

      if (!openAipState.enabled) return false;
      if (openAipState.loadingByViewport[viewportKey]) return false;

      const existingViewport = openAipState.viewportIndex[viewportKey];

      if (!existingViewport) return true;

      const isFresh =
        Date.now() - existingViewport.fetchedAt < openAipState.ttlMs;

      return !isFresh;
    },
  },
);

interface OpenAipState {
  enabled: boolean;
  showAirports: boolean;
  showAirspaces: boolean;

  enabledAirportTypes: boolean[];
  enabledAirspaceTypes: boolean[];

  // normalized entities
  airportsById: Record<string, IOpenAipAirport>;
  airspacesById: Record<string, IOpenAipAirspace>;

  // spatial index (which IDs belong to which fetched viewport)
  viewportIndex: Record<
    ViewportKey,
    { airportIds: string[]; airspaceIds: string[]; fetchedAt: number }
  >;

  loadingByViewport: Record<ViewportKey, boolean>;
  errorByViewport: Record<ViewportKey, string | null>;
  ttlMs: number; // e.g. 10 min
}

const initialState: OpenAipState = {
  enabled: true,
  showAirports: false,
  showAirspaces: true,
  enabledAirportTypes: Array.from({ length: 14 }, _ => true),
  enabledAirspaceTypes: Array.from({ length: 37 }, (_, i) =>
    i !== 0 && i !== 10 ? true : false,
  ), // exclude Other and Flight Information Region
  airportsById: {},
  airspacesById: {},
  viewportIndex: {},
  loadingByViewport: {},
  errorByViewport: {},
  ttlMs: 10 * 60 * 1000,
};

export const openAipSlice = createSlice({
  name: 'openAip',
  initialState,
  reducers: {
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setShowAirports: (state, action: PayloadAction<boolean>) => {
      state.showAirports = action.payload;
    },
    setShowAirspaces: (state, action: PayloadAction<boolean>) => {
      state.showAirspaces = action.payload;
    },
    toggleEnabledAirportType: (state, action: PayloadAction<number>) => {
      state.enabledAirportTypes[action.payload] =
        !state.enabledAirportTypes[action.payload];
    },
    toggleEnabledAirspaceType: (state, action: PayloadAction<number>) => {
      state.enabledAirspaceTypes[action.payload] =
        !state.enabledAirspaceTypes[action.payload];
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchOpenAipForViewport.pending, (state, action) => {
      const viewport = action.meta.arg.viewportKey;

      state.loadingByViewport[viewport] = true;
      state.errorByViewport[viewport] = null;
    });
    builder.addCase(fetchOpenAipForViewport.fulfilled, (state, action) => {
      const viewport = action.meta.arg.viewportKey;
      const { airports, airspaces, fetchedAt } = action.payload;

      state.loadingByViewport[viewport] = false;
      state.errorByViewport[viewport] = null;

      for (const airport of airports) {
        state.airportsById[airport._id] = airport;
      }
      for (const airspace of airspaces) {
        state.airspacesById[airspace._id] = airspace;
      }

      const airportIds = [...new Set(airports.map(airport => airport._id))];
      const airspaceIds = [...new Set(airspaces.map(airspace => airspace._id))];

      state.viewportIndex[viewport] = {
        airportIds,
        airspaceIds,
        fetchedAt,
      };
    });
    builder.addCase(fetchOpenAipForViewport.rejected, (state, action) => {
      const viewport = action.meta.arg.viewportKey;

      state.loadingByViewport[viewport] = false;
      state.errorByViewport[viewport] =
        action.error.message || 'Failed to fetch openAip for viewport';
    });
  },
});

export const {
  setEnabled,
  setShowAirports,
  setShowAirspaces,
  toggleEnabledAirportType,
  toggleEnabledAirspaceType,
} = openAipSlice.actions;
