import {
  Box,
  FormControl,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import CategoryIcon from '@mui/icons-material/Category';
import FunctionsIcon from '@mui/icons-material/Functions';
import { AggregationFunction } from '../../../../shared/models/dataexploration.model';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';
import SearchableSelect from '../../../../shared/components/searchable-select';

const SEP = '|||';

const HeatMapControlPanel = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);

  const isNumericType = (t?: string) =>
    t === 'DOUBLE' || t === 'FLOAT' || t === 'INTEGER' || t === 'BIGINT';

  const functionsForType = (t?: string): AggregationFunction[] =>
    isNumericType(t)
      ? [
        AggregationFunction.AVG,
        AggregationFunction.MIN,
        AggregationFunction.MAX,
        AggregationFunction.COUNT,
      ]
      : [AggregationFunction.COUNT];

  const originalColumns =
    tab?.workflowTasks.dataExploration?.metaData.data?.originalColumns || [];

  // encoded options: "<column>|||<FN>"
  const measureAggOptions: string[] = originalColumns
    .filter(col => col.type !== 'LOCAL_DATE_TIME')
    .flatMap(col => functionsForType(col.type).map(fn => `${col.name}${SEP}${fn}`));

  const getOptionLabel = (encoded: string) => {
    const [col, fn] = encoded.split(SEP);

    return `${col} (${fn})`;
  };

  const parseEncoded = (encoded: string) => {
    const [column, fnRaw] = encoded.split(SEP);

    return { column, function: fnRaw as AggregationFunction };
  };

  const selectedColumn =
    tab?.workflowTasks.dataExploration?.controlPanel.selectedMeasureColumnHeat || '';

  const selectedFn =
    tab?.workflowTasks.dataExploration?.controlPanel.barAggregationHeat?.[0]
      ?.function || '';

  const selectedMeasureAggValue =
    selectedColumn && selectedFn ? `${selectedColumn}${SEP}${selectedFn}` : '';

  const handleMeasureAggChange = (encoded: string) => {
    if (!encoded) {
      dispatch(setControls({ selectedMeasureColumnHeat: null, barAggregationHeat: [] }));

      return;
    }

    const next = parseEncoded(encoded);

    dispatch(
      setControls({
        selectedMeasureColumnHeat: next.column,
        barAggregationHeat: [{ column: next.column, function: next.function }],
      }),
    );
  };

  return (
    <Box
        sx={{
          display: 'flex',
          gap: '1rem',
          flexDirection: 'column',
        }}
      >
        {/* Group By Selection */}
        <FormControl fullWidth size="small">
          <SearchableMultiSelect
            labelId="group-by-heat-label"
            inputLabel={
              <Box display="flex" alignItems="center" gap={0.5}>
                <CategoryIcon sx={{ fontSize: 14 }} />
                Group By (Category)
              </Box>
            }
            label="Group By (Category)"
            value={
              tab?.workflowTasks.dataExploration?.controlPanel.barGroupByHeat || []
            }
            options={
              tab?.workflowTasks.dataExploration?.metaData.data?.originalColumns
                .filter(col => col.type === 'STRING')
                .map(col => col.name) || []
            }
            onChange={(selected: string[]) => {
              if (selected.length <= 2) {
                dispatch(setControls({ barGroupByHeat: selected }));
              }
            }}
            isOptionDisabled={(option, selected) =>
              selected.length >= 2 && !selected.includes(option)
            }
            menuMaxHeight={224}
            menuWidth={250}
          />
        </FormControl>
        <FormControl fullWidth size="small">
          <SearchableSelect
            labelId="measure-agg-heat-label"
            inputLabel={
              <Box display="flex" alignItems="center" gap={0.5}>
                <FunctionsIcon sx={{ fontSize: 14 }} />
                Measure + Aggregation
              </Box>
            }
            label="Measure + Aggregation"
            value={selectedMeasureAggValue}
            options={measureAggOptions}
            getOptionLabel={getOptionLabel}
            onChange={handleMeasureAggChange}
            menuMaxHeight={240}
            menuWidth={360}
          />
        </FormControl>
      </Box>
  );
};

export default HeatMapControlPanel;
