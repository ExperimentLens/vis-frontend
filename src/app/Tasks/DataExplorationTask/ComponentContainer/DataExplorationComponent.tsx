import type React from 'react';
import { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Tooltip,
  Fade,
  Skeleton,
  Button,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  dataExplorationDefault,
} from '../../../../shared/models/tasks/data-exploration-task.model';
import { fetchMetaData } from '../../../../store/slices/dataExplorationSlice';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import LeftPanel from './data-exploration-left-panel';
import LineChart from '../Charts/data-exploration-line-chart';
import ScatterChart from '../Charts/data-exploration-scatter-chart';
import BarChart from '../Charts/data-exploration-bar-chart';
import TableExpand from '../Charts/data-exploration-data-table';
import HeatMap from '../Charts/data-exploration-heatmap';
import MapCardWrapper from '../Charts/map-wrap';
import ImageCard from '../Charts/data-exploration-image';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TableRowsIcon from '@mui/icons-material/TableRows';

const chartLabels: Record<string, string> = {
  datatable: 'Table',
  line: 'Line Chart',
  bar: 'Bar Chart',
  heatmap: 'Heatmap',
  scatter: 'Scatter Plot',
  map: 'Map',
};

interface MetaChipProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'info' | 'warning';
  loading?: boolean;
  width?: number;
}

const MetaChip = ({ icon, label, tone = 'default', loading, width = 64 }: MetaChipProps) => {
  const theme = useTheme();

  if (loading) return <Skeleton variant="rounded" width={width} height={22} />;

  const toneColor =
    tone === 'primary' ? theme.palette.primary.main :
      tone === 'success' ? theme.palette.success.main :
        tone === 'info' ? theme.palette.info.main :
          tone === 'warning' ? theme.palette.warning.main :
            theme.palette.text.secondary;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.85,
        py: 0.25,
        borderRadius: '999px',
        bgcolor: tone === 'default' ? 'transparent' : alpha(toneColor, 0.1),
        color: toneColor,
        // fontFamily: theme.typography.mono.fontFamily,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.2px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        border: tone === 'default' ? 'none' : `1px solid ${alpha(toneColor, 0.2)}`,
      }}
    >
      {icon}
      <span>{label}</span>
    </Box>
  );
};

const DataExplorationComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { tab } = useAppSelector(state => state.workflowPage);
  const experimentId = useAppSelector(state => state.progressPage?.experiment.data?.id || '');
  const dataset = useAppSelector(
    state => state.workflowPage?.tab?.dataTaskTable?.selectedItem?.data?.dataset,
  );
  const workflowId = useAppSelector(state => state.workflowPage?.tab?.workflowId || '');
  const chartType = useAppSelector(
    state => state.workflowPage?.tab?.workflowTasks?.dataExploration?.controlPanel?.chartType || '',
  );
  const selectedDataset = dataset?.source || '';
  const meta = tab?.workflowTasks.dataExploration?.metaData;
  const isImage = !!meta?.data?.datasetType?.match('IMAGE');
  const cardRef = useRef<HTMLDivElement>(null);

  const triggerFetchMeta = () => {
    if (!selectedDataset || !workflowId) return;
    dispatch(setControls({ ...dataExplorationDefault.controlPanel }));
    dispatch(
      fetchMetaData({
        query: {
          source: selectedDataset,
          format: dataset?.format || '',
          sourceType: dataset?.sourceType || '',
          fileName: dataset?.name || '',
          runId: workflowId || '',
          experimentId: experimentId || '',
          includeSummary: false,
          includeTotalItems: true,
          detectDatasetType: true,
        },
        metadata: { workflowId, queryCase: 'metaData' },
      }),
    );
  };

  useEffect(() => {
    if (selectedDataset && workflowId) triggerFetchMeta();
  }, [selectedDataset, workflowId]);

  // Reset card scroll when switching chart types so the new viz starts in view.
  useEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [chartType]);

  const hasLatLon = !!meta?.data?.hasLatLonColumns;
  const hasTime = (meta?.data?.timeColumn?.length ?? 0) > 0;

  if (!selectedDataset)
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 520, textAlign: 'center' }}>
          <Box
            sx={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.primary.main, 0.04)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AssessmentIcon sx={{ fontSize: 44, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Start exploring your data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a dataset from the table on the left to inspect its schema, generate
            visualizations, and apply interactive filters across multiple chart types.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            <MetaChip icon={<TableRowsRoundedIcon sx={{ fontSize: 14 }} />} label="Table view" />
            <MetaChip icon={<AssessmentIcon sx={{ fontSize: 14 }} />} label="Line · Bar · Scatter" />
            <MetaChip icon={<PlaceRoundedIcon sx={{ fontSize: 14 }} />} label="Geo · Heatmap" />
          </Stack>
        </Stack>
      </Box>
    );

  if (meta?.error)
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 520, textAlign: 'center' }}>
          <Box
            sx={{
              width: 92,
              height: 92,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(theme.palette.error.main, 0.18)}, ${alpha(theme.palette.error.main, 0.04)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReportProblemRoundedIcon sx={{ fontSize: 44, color: 'error.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Could not load dataset
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We were unable to fetch metadata for{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {dataset?.name || selectedDataset}
            </Box>
            . This is usually a temporary issue with the storage backend.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshRoundedIcon />}
            onClick={triggerFetchMeta}
            sx={{ mt: 1, textTransform: 'none', borderRadius: 2 }}
          >
            Retry
          </Button>
        </Stack>
      </Box>
    );

  // const datasetType = meta?.data?.datasetType ?? 'TABULAR';
  const cols = meta?.data?.originalColumns?.length ?? 0;
  const rows = meta?.data?.totalItems ?? 0;
  const isMetaLoading = !!meta?.loading && !meta?.data;

  const summaryBanner = (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        background: theme.palette.customSurface.cardHeader,
        borderColor: theme.palette.customGrey.main,
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        divider={<Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />}
        sx={{ flexWrap: 'wrap', rowGap: 0.5 }}
      >
        <Tooltip title={selectedDataset} arrow>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <StorageRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography
              variant="mono"
              sx={{
                fontWeight: 700,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 320,
              }}
            >
              {dataset?.name || selectedDataset}
            </Typography>
          </Stack>
        </Tooltip>

        <MetaChip
          icon={<ViewColumnRoundedIcon sx={{ fontSize: 14 }} />}
          label={`${cols} cols`}
          loading={isMetaLoading}
          width={68}
        />
        <MetaChip
          icon={<TableRowsIcon sx={{ fontSize: 14 }} />}
          label={`${rows} rows`}
          loading={isMetaLoading}
          width={68}
        />
        {dataset?.format && (
          <MetaChip
            icon={<InsertDriveFileOutlinedIcon sx={{ fontSize: 14 }} />}
            label={dataset.format.toUpperCase()}
          />
        )}
        {/* <MetaChip label={datasetType.replace(/_/g, ' ')} tone="primary" /> */}

        {hasTime && (
          <Tooltip title={`Time column: ${meta?.data?.timeColumn?.join(', ')}`} arrow>
            <Box sx={{ display: 'inline-flex' }}>
              <MetaChip
                icon={<AccessTimeRoundedIcon sx={{ fontSize: 14 }} />}
                label="Temporal"
                tone="info"
              />
            </Box>
          </Tooltip>
        )}
        {hasLatLon && (
          <MetaChip
            icon={<PlaceRoundedIcon sx={{ fontSize: 14 }} />}
            label="Geo"
            tone="success"
          />
        )}

      </Stack>
    </Paper>
  );

  if (isImage)
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: 1,
          height: '100%',
          overflow: 'auto',
        }}
      >
        {summaryBanner}
        <ImageCard />
      </Box>
    );

  const chartFallback = isMetaLoading ? (
    <Box sx={{ p: 3, height: '100%' }}>
      <Skeleton variant="rounded" height={32} sx={{ mb: 2, width: '40%' }} />
      <Skeleton variant="rounded" height="80%" />
    </Box>
  ) : (
    <InfoMessage
      message="Select a chart type to begin visualizing this dataset."
      type="info"
      icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
      fullHeight
    />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: 1,
        height: '100%',
        overflow: 'auto',
      }}
    >
      {summaryBanner}
      <LeftPanel />
      <Paper
        ref={cardRef}
        elevation={1}
        sx={{
          flex: 1,
          overflow: 'auto',
          height: '100%',
          width: '100%',
          position: 'relative',
        }}
      >
        <Fade key={chartType || 'empty'} in timeout={250}>
          <Box sx={{ height: '100%', width: '100%' }}>
            {chartType === 'datatable' && <TableExpand />}
            {chartType === 'line' && <LineChart />}
            {chartType === 'scatter' && <ScatterChart />}
            {chartType === 'bar' && <BarChart />}
            {chartType === 'heatmap' && <HeatMap />}
            {chartType === 'map' && <MapCardWrapper />}
            {!chartType && chartFallback}
          </Box>
        </Fade>
      </Paper>
    </Box>
  );
};

export default DataExplorationComponent;
