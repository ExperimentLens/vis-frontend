import type { Meta } from './meta';
import type { Score } from './score';

export interface ScoresResponse {
    data: Score[];
    meta: Meta;
}
