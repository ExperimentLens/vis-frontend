import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import type { IDataAsset } from '../../../../../shared/models/experiment/data-asset.model';
import { useMemo } from 'react';
import type { RootState } from '../../../../../store/store';
import { useAppSelector } from '../../../../../store/store';
import { Handler } from 'vega-tooltip';

export interface BoxPlotProps {
  assetName: string;
  columnName: string;
  assets: Array<{ workflowId: string; dataAsset: IDataAsset }>;
  colorScale: (ids: string[]) => { domain: string[]; range: string[] };
}

type SummaryEntry = {
  column_name?: string;
  column_type?: string;
  min?: string | number | null;
  max?: string | number | null;
  q25?: string | number | null;
  q50?: string | number | null;
  q75?: string | number | null;
};

type Row = {
  workflowId: string;
  min: number;
  max: number;
  q25: number;
  q50: number;
  q75: number;
};

const toNum = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);

    return Number.isFinite(n) ? n : null;
  }

  return null;
};

const normalizeKey = (s: string) => (s || '').trim().toLowerCase()
  .replace(/-/g, '_');

const BoxPlot = ({ assetName, columnName, assets, colorScale }: BoxPlotProps) => {
  const workflowIds = useMemo(() => assets.map(a => a.workflowId), [assets]);

  const tooltipHandler = useMemo(() => {
    return new Handler({
      sanitize: (v: unknown) => String(v),
    }).call;
  }, []);

  const metas = useAppSelector((state: RootState) =>
    Object.fromEntries(
      assets.map(({ workflowId }) => [
        workflowId,
        state.monitorPage.comparativeDataExploration.dataAssetsMetaData?.[assetName]?.[workflowId]?.meta,
      ])
    )
  );

  const { rows, isNumeric, anyMissingSummary } = useMemo(() => {
    const want = normalizeKey(columnName);
    const out: Row[] = [];
    let missing = false;

    workflowIds.forEach(workflowId => {
      const meta = metas[workflowId];
      const summary = meta?.data?.summary as SummaryEntry[] | undefined;

      if (!Array.isArray(summary)) {
        missing = true;

        return;
      }

      const entry = summary.find(s => normalizeKey(String(s.column_name ?? '')) === want);

      if (!entry) {
        missing = true;

        return;
      }

      const min = toNum(entry.min);
      const max = toNum(entry.max);
      const q25 = toNum(entry.q25);
      const q50 = toNum(entry.q50);
      const q75 = toNum(entry.q75);

      if ([min, max, q25, q50, q75].some(v => v === null)) {
        // Typically means non-numeric/string column (quantiles not computed)
        return;
      }

      out.push({
        workflowId,
        min: min!,
        max: max!,
        q25: q25!,
        q50: q50!,
        q75: q75!,
      });
    });

    return {
      rows: out,
      isNumeric: out.length > 0,
      anyMissingSummary: missing,
    };
  }, [workflowIds, metas, columnName]);

  const spec = useMemo(() => {
    const { domain, range } = colorScale(workflowIds);

    const tooltip = [
      { field: 'workflowId', type: 'nominal', title: 'Workflow' },
      { field: 'min', type: 'quantitative', title: 'Min' },
      { field: 'q25', type: 'quantitative', title: 'Q25' },
      { field: 'q50', type: 'quantitative', title: 'Median' },
      { field: 'q75', type: 'quantitative', title: 'Q75' },
      { field: 'max', type: 'quantitative', title: 'Max' },
    ];

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: `Box plot summary of ${columnName} across workflows`,
      data: { values: rows },
      encoding: {
        x: {
          field: 'workflowId',
          type: 'nominal',
          title: null,
          sort: workflowIds,
          axis: {
            labelAngle: -20,
            labelFontSize: 10,
            labelLimit: 90,
            labelExpr:
              'length(datum.value) > 8 ? substring(datum.value, 0, 8) + \'…\' : datum.value',
          },
        },
        color: {
          field: 'workflowId',
          type: 'nominal',
          scale: { domain, range },
          legend: null,
        },
      },
      layer: [
        {
          // whiskers
          mark: { type: 'rule' },
          encoding: {
            y: { field: 'min', type: 'quantitative', title: columnName },
            y2: { field: 'max' },
            tooltip,
          },
        },
        {
          // whisker cap (min)
          mark: { type: 'tick', orient: 'horizontal', size: 24, thickness: 2 },
          encoding: {
            y: { field: 'min', type: 'quantitative', title: columnName },
            color: { value: '#000' },
            tooltip,
          },
        },
        {
          // whisker cap (max)
          mark: { type: 'tick', orient: 'horizontal', size: 24, thickness: 2 },
          encoding: {
            y: { field: 'max', type: 'quantitative', title: columnName },
            color: { value: '#000' },
            tooltip,
          },
        },
        {
          // box
          mark: { type: 'bar', size: 24, opacity: 0.55, blend: 'multiply' },
          encoding: {
            y: { field: 'q25', type: 'quantitative', title: columnName },
            y2: { field: 'q75' },
            tooltip,
          },
        },
        {
          // median
          mark: { type: 'tick', size: 24, color: '#111' },
          encoding: {
            y: { field: 'q50', type: 'quantitative', title: columnName },
            tooltip,
          },
        },
      ],
    };
  }, [rows, workflowIds, colorScale, columnName]);

  const shouldShowInfo = !isNumeric;

  const message = (
    <InfoMessage
      message={
        anyMissingSummary
          ? 'Box plot not available (missing summary statistics for one or more workflows).'
          : 'Box plot is available only for numeric columns.'
      }
      type="info"
      icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
      fullHeight
    />
  );

  return (
    <ResponsiveCardVegaLite
      spec={spec}
      actions={false}
      isStatic={false}
      title={`${assetName} — ${columnName}`}
      sx={{ width: '100%', maxWidth: '100%' }}
      showInfoMessage={shouldShowInfo}
      infoMessage={shouldShowInfo ? message : <></>}
      tooltip={tooltipHandler}
    />
  );
};

export default BoxPlot;
