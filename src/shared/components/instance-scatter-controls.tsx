import type React from 'react';
import { Box } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SearchableSelect from './searchable-select';
import SegmentedToggle from './segmented-toggle';
import ControlSection from './control-section';

interface InstanceScatterControlsProps {
  /** Field names offered in the X/Y axis selectors. */
  options: string[]
  xAxisOption: string
  yAxisOption: string
  useUmap: boolean
  onXAxisChange: (value: string) => void
  onYAxisChange: (value: string) => void
  onUseUmapChange: (useUmap: boolean) => void
  /**
   * Disable the axis selectors regardless of projection mode (e.g. while data
   * loads). They are *always* disabled while UMAP projection is active, since
   * the embedding ignores the chosen axes.
   */
  axesDisabled?: boolean
}

/**
 * Chart-options panel shared by the instance-classification scatterplot (model
 * analysis) and the comparative model-instance scatterplot. Keeping the markup
 * in one place guarantees both render identically: an X/Y axis pair (disabled
 * in UMAP mode) above a Features/UMAP projection toggle.
 */
const InstanceScatterControls: React.FC<InstanceScatterControlsProps> = ({
  options,
  xAxisOption,
  yAxisOption,
  useUmap,
  onXAxisChange,
  onYAxisChange,
  onUseUmapChange,
  axesDisabled = false,
}) => {
  const axisDisabled = useUmap || axesDisabled;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.25 }}>
        <SearchableSelect
          labelId="x-axis-select-label"
          inputLabel={
            <Box display="flex" alignItems="center" gap={0.5}>
              <ShowChartIcon sx={{ fontSize: 14 }} />
              X-Axis
            </Box>
          }
          label="X-Axis"
          value={xAxisOption}
          options={options.filter(option => option !== yAxisOption)}
          onChange={onXAxisChange}
          disabled={axisDisabled}
          menuMaxHeight={224}
          menuWidth={236}
        />
        <SearchableSelect
          labelId="y-axis-select-label"
          inputLabel={
            <Box display="flex" alignItems="center" gap={0.5}>
              <ShowChartIcon sx={{ fontSize: 14 }} />
              Y-Axis
            </Box>
          }
          label="Y-Axis"
          value={yAxisOption}
          options={options.filter(option => option !== xAxisOption)}
          onChange={onYAxisChange}
          disabled={axisDisabled}
          menuMaxHeight={224}
          menuWidth={236}
        />
      </Box>

      <ControlSection label="Projection" icon={<ShowChartIcon sx={{ fontSize: 14 }} />}>
        <SegmentedToggle
          aria-label="projection mode"
          value={useUmap ? 'umap' : 'features'}
          onChange={(v) => onUseUmapChange(v === 'umap')}
          options={[
            { value: 'features', label: 'Features' },
            { value: 'umap', label: 'UMAP' },
          ]}
        />
      </ControlSection>
    </Box>
  );
};

export default InstanceScatterControls;
