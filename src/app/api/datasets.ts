import { api } from './api';
import type { Dataset, DatasetDetail, DatasetItem, DatasetItemRequest } from '../../shared/models/observability/dataset';

const base = '/observability/datasets';
const enc = encodeURIComponent;

export const listDatasets = () => api.get<Dataset[]>(base).then(r => r.data);

export const createDataset = (name: string, description?: string) =>
  api.post<Dataset>(base, { name, description }).then(r => r.data);

export const getDataset = (name: string) => api.get<DatasetDetail>(`${base}/${enc(name)}`).then(r => r.data);

export const addDatasetItem = (datasetName: string, request: DatasetItemRequest) =>
  api.post<DatasetItem>(`${base}/${enc(datasetName)}/items`, request).then(r => r.data);

export const updateDatasetItem = (datasetName: string, itemId: string, request: DatasetItemRequest) =>
  api.put<DatasetItem>(`${base}/${enc(datasetName)}/items/${enc(itemId)}`, request).then(r => r.data);

export const datasetsContainingTrace = (traceId: string) =>
  api.get<string[]>(`${base}/by-trace/${enc(traceId)}`).then(r => r.data);
