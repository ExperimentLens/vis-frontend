import { Box, Button, ButtonGroup, FormControl } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import CategoryIcon from '@mui/icons-material/Category';
import FunctionsIcon from '@mui/icons-material/Functions';
import { AggregationFunction } from '../../../../shared/models/dataexploration.model';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';

const SEP = '|||';

const BarChartControlPanel = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);

  const viewMode =
    tab?.workflowTasks.dataExploration?.controlPanel?.viewMode || 'overlay';

  const originalColumns =
    tab?.workflowTasks.dataExploration?.metaData.data?.originalColumns || [];

  const currentAgg =
    tab?.workflowTasks.dataExploration?.controlPanel.barAggregation || [];

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

  // Encoded options stored in Select value: "<column>|||<FN>"
  const measureAggOptions: string[] = originalColumns
    .filter(col => col.type !== 'LOCAL_DATE_TIME')
    .flatMap(col =>
      functionsForType(col.type).map(fn => `${col.name}${SEP}${fn}`),
    );

  // Selected values from Redux -> encoded values
  const selectedMeasureAggValues: string[] = currentAgg.map(
    a => `${a.column}${SEP}${a.function}`,
  );

  const getOptionLabel = (encoded: string) => {
    const [col, fn] = encoded.split(SEP);
    return `${col} (${fn})`;
  };

  const parseEncoded = (encoded: string) => {
    const [column, fnRaw] = encoded.split(SEP);
    return { column, function: fnRaw as AggregationFunction };
  };

  const handleMeasureAggChange = (encodedValues: string[]) => {
    const nextAgg = encodedValues
      .map(parseEncoded)
      .filter(a => a.column && a.function);

    const last = encodedValues[encodedValues.length - 1];
    // maybe I should remove this?
    const lastColumn = last ? last.split(SEP)[0] : '';

    dispatch(
      setControls({
        barAggregation: nextAgg,
        selectedMeasureColumn: lastColumn,
      }),
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
      {/* Group By */}
      <FormControl fullWidth>
        <SearchableSelect
          labelId="group-by-category-label"
          inputLabel={
            <Box display="flex" alignItems="center" gap={1}>
              <CategoryIcon fontSize="small" />
              Group By (Category)
            </Box>
          }
          label="Group By (Category) ----"
          value={
            tab?.workflowTasks.dataExploration?.controlPanel.barGroupBy?.[0] || ''
          }
          options={originalColumns.filter(col => col.type === 'STRING').map(col => col.name)}
          onChange={value => dispatch(setControls({ barGroupBy: [value] }))}
          menuMaxHeight={224}
          menuWidth={250}
        />
      </FormControl>

      {/* Measure + Aggregations (searchable multi select) */}
      <SearchableMultiSelect
        labelId="measure-agg-multi-select-label"
        inputLabel={
          <Box display="flex" alignItems="center" gap={1}>
            <FunctionsIcon fontSize="small" />
            Measure + Aggregations
          </Box>
        }
        label="Measure + Aggregations ----"
        value={selectedMeasureAggValues}
        options={measureAggOptions}
        getOptionLabel={getOptionLabel}
        onChange={handleMeasureAggChange}
        menuMaxHeight={240}
        menuWidth={360}
      />

      {/* View mode */}
      <Box sx={{ mt: 1, display: 'flex', gap: '1rem', flexDirection: 'row', width: '100%' }}>
        <ButtonGroup variant="contained" aria-label="view mode" sx={{ height: '36px' }} fullWidth>
          <Button
            color={viewMode === 'overlay' ? 'primary' : 'inherit'}
            onClick={() => dispatch(setControls({ viewMode: 'overlay' }))}
          >
            Overlay
          </Button>
          <Button
            color={viewMode === 'stacked' ? 'primary' : 'inherit'}
            onClick={() => dispatch(setControls({ viewMode: 'stacked' }))}
          >
            Stacked
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
};

export default BarChartControlPanel;
