import Box from '@mui/material/Box';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InstanceClassificationUmap from './instance-classification-umap';
import type { TestInstance } from '../../../../shared/models/tasks/model-analysis.model';
import type { View, Item, ScenegraphEvent } from 'vega';
import InfoMessage from '../../../../shared/components/InfoMessage';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import Loader from '../../../../shared/components/loader';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import { getClassColorMap } from '../../../../shared/utils/colorUtils';
import InstanceScatterControls from '../../../../shared/components/instance-scatter-controls';

interface IInstanceClassification {
  plotData: {
    data: TestInstance[] | null
    loading: boolean
    error: string | null
  } | null
  point: { id: string; data: TestInstance } | null
  showMisclassifiedOnly: boolean
  setPoint: Dispatch<SetStateAction<{ id: string; data: TestInstance } | null>>
  setShapPoint: Dispatch<SetStateAction<{ id: string; data: TestInstance } | null>>
  hashRow: (row: TestInstance) => string
}

const InstanceClassification = (props: IInstanceClassification) => {
  const theme = useTheme();
  const { tab } = useAppSelector(
    (state: RootState) => state.workflowPage,
  );

  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));
  const { plotData, setPoint, setShapPoint, point, showMisclassifiedOnly, hashRow } = props;
  const [options, setOptions] = useState<string[]>([]);
  const [xAxisOption, setXAxisOption] = useState<string>('');
  const [yAxisOption, setYAxisOption] = useState<string>('');
  const [useUmap, setUseUmap] = useState(false);

  const inferFieldType = (data: TestInstance[], field: string): 'quantitative' | 'nominal' => {
    const sample = data.find(d => d[field] !== undefined)?.[field];

    if (typeof sample === 'number') return 'quantitative';

    return 'nominal';
  };

  let classColorMap: Record<string, string> = {};

  if (!showMisclassifiedOnly && plotData?.data?.length) {
    const predictedValues = Array.from(new Set(plotData.data.map(d => String(d.predicted))));

    classColorMap = getClassColorMap(predictedValues);
  }

  const getCounterfactualsData = (
    tableContents: Record<string, { values: string[] }> | undefined,
    point: { data: Record<string, unknown> } | null
  ): TestInstance[] | null => {
    if (!point || !tableContents) return null;

    const columns = Object.keys(tableContents);
    const baseRowIndex = 0;
    const rowCount = tableContents[columns[0]]?.values.length || 0;

    return Array.from({ length: rowCount - 1 }, (_, index) => {
      const actualIndex = index + 1; // counterfactuals start from row 1
      const row: Record<string, string> = {};

      for (const key of columns) {
        const baseValueStr = tableContents[key].values[baseRowIndex];
        const cfValueStr = tableContents[key].values[actualIndex];

        if (key === 'label') {
          row['predicted'] = cfValueStr;
          continue;
        }

        if (cfValueStr === '-') {
          row[key] = baseValueStr;
          continue;
        }

        const baseValue = parseFloat(baseValueStr);
        const delta = parseFloat(cfValueStr);
        const isNumericDelta =
        !isNaN(baseValue) && !isNaN(delta) && /^[+-]?\d+(\.\d+)?$/.test(cfValueStr);

        if (isNumericDelta) {
          row[key] = String(baseValue + delta); // ensure string
        } else {
          row[key] = cfValueStr;
        }
      }

      return {
        ...Object.fromEntries(
          Object.entries(point.data).map(([k, v]) => [k, String(v)])
        ),
        ...row,
        actual: String(point.data.actual),
        instanceId: point.data.instanceId
      } as TestInstance;
    });
  };

  const getVegaData = (data: TestInstance[]) => {
    const originalPoints = data.map((originalRow: TestInstance) => {
      const id = hashRow(originalRow);
      const isMisclassified = originalRow.actual !== originalRow.predicted;

      return {
        ...originalRow,
        isMisclassified,
        pointType: 'Original',
        id,
      };
    });

    const counterfactualPoints = showMisclassifiedOnly &&  point?.data?.predicted !== point?.data?.actual ? getCounterfactualsData(
      tab?.workflowTasks.modelAnalysis?.counterfactuals?.data?.tableContents,
      point
    )?.map((cfRow) => {
      const id = hashRow(cfRow);

      return {
        ...cfRow,
        pointType: 'Counterfactual',
        id,
      };
    }) ?? [] : [];

    return [...originalPoints, ...counterfactualPoints];
  };

  useEffect(() => {
    if (plotData && plotData.data) {
      setOptions(Object.keys(plotData.data[0]));
    }
  }, [plotData]);

  useEffect(() => {
    if (options.length > 1) {
      setXAxisOption(options[0]);
      const yOption = options.find(opt => opt !== options[0]);

      if (yOption) setYAxisOption(yOption);
    }
  }, [options]);

  const handleNewView = (view: View) => {
    view.addEventListener('click', (event: ScenegraphEvent, item: Item | null | undefined) => {
      const datum = item?.datum as (Partial<TestInstance> & { id: string; isMisclassified?: boolean }) | undefined;

      if (datum) {
        const { id, ...dataWithoutId } = datum;
        const cleanedData = Object.fromEntries(
          Object.entries(dataWithoutId).filter(([_key, v]) => v !== undefined)
        ) as TestInstance;

        setPoint({ id, data: cleanedData });
        if(!showMisclassifiedOnly || !datum.isMisclassified) setShapPoint({ id, data: cleanedData });
        else setShapPoint(null);
      }
    });
  };

  const xFieldType = plotData?.data ? inferFieldType(plotData.data, xAxisOption) : 'nominal';
  const yFieldType = plotData?.data ? inferFieldType(plotData.data, yAxisOption) : 'nominal';

  const info = (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100%"
    >
      {
        plotData?.loading ? (
          <Loader />
        ) : (
          <InfoMessage
            message="No Data Available."
            type="info"
            icon={<ReportProblemRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
            fullHeight
          />
        )
      }
    </Box>
  );
  const shouldShowInfoMessage = plotData?.loading || !plotData?.data;

  return (
    useUmap ? (
      <InstanceClassificationUmap
        point={point}
        showMisclassifiedOnly={showMisclassifiedOnly}
        setPoint={setPoint}
        setShapPoint={setShapPoint}
        hashRow={hashRow}
        useUmap={useUmap}
        setuseUmap={setUseUmap}
        options={options}
        xAxisOption={xAxisOption}
        yAxisOption={yAxisOption}
        setXAxisOption={setXAxisOption}
        setYAxisOption={setYAxisOption}
      />
    ) : (
      <ResponsiveCardVegaLite
        spec={{
          width: 'container',
          height: 'container',
          autosize: { type: 'fit', contains: 'padding', resize: true },
          data: {
            values: getVegaData(plotData?.data ?? []),
          },
          params: [
            {
              name: 'pts',
              select: { type: 'point', toggle: false },
              bind: 'legend',
            },
            {
              name: 'highlight',
              select: { type: 'point', on: 'click', clear: 'clickoff',    fields: ['isMisclassified'],
              },
              value: { isMisclassified: true }

            },
            {
              name: 'selectedPoint',
              value: point?.id ?? null
            },
            {
              name: 'panZoom',
              select: 'interval',
              bind: 'scales',
            },
          ],
          mark: {
            type: 'point',
            filled: true,
            size: 100,
          },

          encoding: {
            x: {
              field: xAxisOption || 'xAxis default',
              type: xFieldType,
              axis: { labelAngle: xFieldType === 'nominal' ? -45 : 0, labelLimit: 100 }
            },
            y: {
              field: yAxisOption || 'yAxis default',
              type: yFieldType,
            },
            color: {
              condition: {
                test: 'datum.pointType === \'Counterfactual\'',
                value: '#FFA500', // orange for counterfactuals
              },
              field: showMisclassifiedOnly ? 'isMisclassified' : 'predicted',
              type: showMisclassifiedOnly ? 'nominal' : 'nominal',
              scale: showMisclassifiedOnly
                ? {
                  domain: [false, true],
                  range: ['#cccccc', '#ff0000'],
                }
                : {
                  domain: Object.keys(classColorMap),
                  range: Object.values(classColorMap),
                },
              legend: {
                title: showMisclassifiedOnly ? 'Misclassified' : 'Predicted Class',
                labelExpr: showMisclassifiedOnly
                  ? 'datum.label === \'true\' ? \'Misclassified\' : \'Correct\''
                  : undefined,
              },
            },
            opacity: showMisclassifiedOnly
              ? {
                field: 'isMisclassified',
                type: 'nominal',
                scale: {
                  domain: [false, true],
                  range: [0.45, 1.0],
                },
              }
              : {
                value: 0.8,
              },
            size: showMisclassifiedOnly ? {
              field: 'isMisclassified',
              type: 'nominal',
              scale: {
                domain: [false, true],
                range: [60, 200],
                legend: false
              },
            } :
              {
                value: 100,
              },
            stroke: {
              condition: {
                test: 'datum.id === selectedPoint',
                value: 'black',
              },
              value: null,
            },
            strokeWidth: {
              condition: {
                test: 'datum.id === selectedPoint',
                value: 2,
              },
              value: 0,
            },
            tooltip: [
              { field: 'pointType', type: 'nominal', title: 'Type' },
              { field: 'actual', type: 'nominal', title: 'Actual' },
              { field: 'predicted', type: 'nominal', title: 'Predicted' },
              { field: xAxisOption || 'xAxis default', type: xFieldType, title: xAxisOption },
              { field: yAxisOption || 'yAxis default', type: yFieldType, title: yAxisOption },
            ]
          },
        }}

        title={'Instance Classification Chart'}
        actions={false}
        controlPanel={
          <InstanceScatterControls
            options={options}
            xAxisOption={xAxisOption}
            yAxisOption={yAxisOption}
            useUmap={useUmap}
            onXAxisChange={setXAxisOption}
            onYAxisChange={setYAxisOption}
            onUseUmapChange={setUseUmap}
            axesDisabled={plotData?.loading || !plotData?.data}
          />
        }
        onNewView={handleNewView}
        infoMessage={info}
        showInfoMessage={shouldShowInfoMessage}
        aspectRatio={isSmallScreen ? 2.8 : 1.8}
        maxHeight={1200}
        isStatic={true}
      />
    )

  );
};

export default InstanceClassification;
