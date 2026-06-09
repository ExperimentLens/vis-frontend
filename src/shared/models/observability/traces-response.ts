import type { Meta } from './meta';
import type { Trace } from './trace';

export interface TracesResponse {
    data: Trace[];
    meta: Meta;
}
