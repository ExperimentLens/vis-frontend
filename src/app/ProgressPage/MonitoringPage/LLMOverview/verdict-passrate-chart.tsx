import { useState } from 'react';
import { useTheme } from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { verdictPassRates } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import InfoMessage from '../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

const band = (r: number) => (r >= 0.75 ? 'good' : r >= 0.5 ? 'mid' : 'bad');

export default function VerdictPassRateChart({
  details,
}: {
  details: TraceDetail[];
}) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [kind, setKind] = useState<'judges' | 'checks'>('judges');

  const rows = verdictPassRates(details, kind).map(r => ({
    ...r,
    band: band(r.passRate),
  }));
  const hasData = rows.length > 0;

  const toggle = (
    <SegmentedToggle
      size="small"
      value={kind}
      onChange={v => setKind(v as 'judges' | 'checks')}
      options={[
        { value: 'judges', label: 'Judges' },
        { value: 'checks', label: 'Checks' },
      ]}
    />
  );

  const spec = hasData ? {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 3 },
    encoding: {
      y: {
        field: 'name',
        type: 'nominal',
        sort: '-x',
        title: null,
      },
      x: {
        field: 'passRate',
        type: 'quantitative',
        title: 'pass rate',
        axis: { format: '.0%' },
        scale: { domain: [0, 1] },
      },
      color: {
        field: 'band',
        type: 'nominal',
        scale: {
          domain: ['good', 'mid', 'bad'],
          range: [
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.error.main,
          ],
        },
        legend: null,
      },
      tooltip: [
        {
          field: 'name',
          title: kind === 'judges' ? 'judge' : 'check',
        },
        {
          field: 'passRate',
          title: 'pass rate',
          format: '.0%',
        },
        {
          field: 'total',
          title: 'samples',
        },
      ],
    },
  } : {};

  return (
    <ResponsiveCardVegaLite
      title="Verdict pass-rates"
      details={`${kind} across traces`}
      spec={spec}
      controlPanel={toggle}
      actions={false}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No data available."
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      tooltip={tooltip}
      maxHeight={260}
      aspectRatio={1.7}
      isStatic={false}
    />
  );
}