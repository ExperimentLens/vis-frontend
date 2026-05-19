import { Meta } from './meta';
import { Trace } from './trace';

export interface TracesResponse {
    data: Trace[];
    meta: Meta;
}
