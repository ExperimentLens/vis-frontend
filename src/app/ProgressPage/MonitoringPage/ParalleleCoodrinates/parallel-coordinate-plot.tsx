import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import DraggableColumns from './draggable-columns';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setParallel } from '../../../../store/slices/monitorPageSlice';
import ParallelCoordinateVega from './parallel-coordinate-vega-plot';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import InfoMessage from '../../../../shared/components/InfoMessage';
import type { IMetric } from '../../../../shared/models/experiment/metric.model';
import type { ParallelDataItem } from '../../../../shared/types/parallel.types';
import { IconButton, Tooltip } from '@mui/material';
import { GridTableRowsIcon } from '@mui/x-data-grid';
import PaletteIcon from '@mui/icons-material/Palette';
import Grid3x3Icon from '@mui/icons-material/Grid3x3';
import SelectionPopover from '../../../../shared/components/selection-popover';

const ParallelCoordinatePlot = () => {
  const { workflows } =
    useAppSelector((state: RootState) => state.progressPage);
  const { parallel, workflowsTable } = useAppSelector((state: RootState) => state.monitorPage);
  const [parallelData, setParallelData] = useState<ParallelDataItem[]>([]);
  const foldArray = useRef<string[]>([]);
  const tooltipArray = useRef<{ [key: string]: string }[]>([]);
  const [ColoranchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [ParamsanchorEl, setParamsAnchorEl] = useState<null | HTMLElement>(null);
  const selectedParams = parallel?.selectedParams ?? [];

  const dispatch = useAppDispatch();

  const handleColorOpen = (event: React.MouseEvent<HTMLElement>) => {
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => setColorAnchorEl(null);

  const colorOpen = Boolean(ColoranchorEl);

  const handleParamsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setParamsAnchorEl(event.currentTarget);
  };

  const handleParamsClose = () => setParamsAnchorEl(null);

  const paramsOpen = Boolean(ParamsanchorEl);

  useEffect(() => {
    if (workflows.data.length > 0) {
      const uniqueParameters = new Set(
        workflows.data.filter(workflow => workflow.status !== 'SCHEDULED')
          .reduce((acc: string[], workflow) => {
            const params = workflow.params;

            if (params) {
              return [...acc, ...params.map(param => param.name)];
            } else {
              return [...acc];
            }
          }, [] as string[]),
      );

      foldArray.current = Array.from(uniqueParameters);
      const data = workflows.data
        .map(workflow => {
          const params = workflow.params;

          return {
            ...Array.from(uniqueParameters).reduce((acc, variant) => {
              acc[variant] =
                params?.find(param => param.name === variant)?.value || '';

              return acc;
            }, {} as Record<string, string | number>),
            ...(workflow.metrics
              ? workflow.metrics?.reduce((acc, metric) => {
                return {
                  ...acc,
                  [metric.name]: metric.value,
                };
              }, {})
              : {}),
            workflowId: workflow.id,
          };
        });

      setParallelData(data);
      let selected = parallel.selected;
      let options = parallel.options;

      if (parallel.options.length === 0) {
        options = Array.from(
          new Set(
            workflows.data
              .filter(workflow => workflow.status !== 'SCHEDULED')
              .reduce((acc: string[], workflow) => {
                const metrics = workflow.metrics
                  ? workflow.metrics.filter(metric => metric.name !== 'rating').map((metric: IMetric) => metric.name)
                  : [];

                return [...acc, ...metrics];
              }, []),
          ),
        );
        selected = options[0];
      }
      tooltipArray.current = Object.keys(parallelData.at(0) ?? {}).map(key => ({ field: key }));
      dispatch(
        setParallel({
          data,
          options,
          selected,
          selectedParams: foldArray.current
        }),
      );
    }
  }, [workflows.data]);

  const handleMetricSelection = (feature: string) => {
    dispatch(setParallel({ selected: feature }));
  };

  const handleParamsSelesction = (params: string[]) => {
    foldArray.current = params;
    dispatch(setParallel({ selectedParams: params }));
  };

  const processedData = useMemo(() => {
    const selectedSet = new Set<string>();
    const isGrouped = workflowsTable.groupBy.length > 0;

    workflowsTable.selectedWorkflows.forEach(id => {
      if (isGrouped) {
        const groupMembers = workflowsTable.grouppedWorkflows[id] || [];

        groupMembers.forEach(id => selectedSet.add(id));
      } else {
        selectedSet.add(id);
      }
    });

    return parallelData.map((item) => {
      const newItem = { ...item };

      for (const key in newItem) {
        if (Array.isArray(newItem[key])) {
          newItem[key] = newItem[key].join(',');
        }
      }

      newItem.selected = selectedSet.has(item.workflowId);

      return newItem;
    }) as (ParallelDataItem & { selected: boolean })[];
  }, [parallelData, workflowsTable.selectedWorkflows]);

  return (
    <Paper elevation={2} sx={{ height: '100%', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '10%' }}>
        <Typography/>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5 }}>
          <Tooltip title="Parameters">
            <IconButton onClick={handleParamsOpen}>
              <Grid3x3Icon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Color By">
            <IconButton onClick={handleColorOpen}>
              <PaletteIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <SelectionPopover
          id="Parameters"
          open={paramsOpen}
          anchorEl={ParamsanchorEl}
          onClose={handleParamsClose}
          title="Parameters"
          icon={<GridTableRowsIcon fontSize="small" />}
          options={Array.from(new Set(
            parallelData.flatMap(item => Object.keys(item))
              .filter(k => !['workflowId', 'selected', 'rating', ...parallel.options].includes(k))
          ))}
          selectedOptions={selectedParams}
          onToggle={(param) => {
            const isSelected = selectedParams.includes(param);

            if (isSelected && selectedParams.length === 1) return;
            const updated = isSelected
              ? selectedParams.filter(p => p !== param)
              : [...selectedParams, param];

            handleParamsSelesction(updated);
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />
        <SelectionPopover
          id="ColorBy"
          open={colorOpen}
          anchorEl={ColoranchorEl}
          onClose={handleColorClose}
          title="Color By"
          icon={<GridTableRowsIcon fontSize="small" />}
          options={parallel.options}
          selectedOptions={parallel.selected ? [parallel.selected] : []}
          onToggle={handleMetricSelection}
          multiSelect={false}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />
      </Box>
      {
        parallel.options.length > 0 ? (
          <Box sx={{ width: '99%', px: 1, position: 'relative' }}>
            <DraggableColumns
              foldArray={foldArray}
              onOrderChange={() => {
                dispatch(setParallel({ ...parallel }));
              }}
            />
            <ParallelCoordinateVega
              progressParallel={parallel}
              foldArray={foldArray}
              selectedWorkflows={workflowsTable.selectedWorkflows}
              processedData={processedData}
            ></ParallelCoordinateVega>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: '90%' }}>
            <InfoMessage
              message="No Metric Data Available."
              type="info"
              icon={<ReportProblemRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
              fullHeight
            />
          </Box>
        )
      }
    </Paper>
  );
};

export default ParallelCoordinatePlot;
