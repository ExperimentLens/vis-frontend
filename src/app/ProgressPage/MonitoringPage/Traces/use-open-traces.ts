import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MONITOR_TAB } from '../../../../store/slices/monitorPageSlice';
import { filtersToQuery } from '../../../../shared/utils/trace-explorer';
import type { TraceFilters } from '../../../../shared/utils/trace-explorer';

/** Opens the experiment's Traces tab with the given filters applied. */
export function useOpenTraces() {
  const navigate = useNavigate();
  const { experimentId } = useParams();

  return useCallback((filters: Partial<TraceFilters>, view: 'list' | 'grid' = 'list') => {
    const query = filtersToQuery(filters);

    query.set('tab', String(MONITOR_TAB.TRACES));
    if (view === 'grid') query.set('view', 'grid');
    navigate(`/${experimentId}/monitoring?${query.toString()}`);
  }, [navigate, experimentId]);
}
