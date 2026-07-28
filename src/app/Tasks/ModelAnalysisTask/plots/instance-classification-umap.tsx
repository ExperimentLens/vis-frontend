
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InstanceScatterControls from '../../../../shared/components/instance-scatter-controls';
import Loader from '../../../../shared/components/loader';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { fetchUmap } from '../../../../store/slices/dataExplorationSlice';
import type { TestInstance } from '../../../../shared/models/tasks/model-analysis.model';
import type { Item, ScenegraphEvent, View } from 'vega';
import { getClassColorMap } from '../../../../shared/utils/colorUtils';

interface Umapi {
  point: { id: string; data: TestInstance } | null
  showMisclassifiedOnly: boolean
  setPoint: Dispatch<SetStateAction<{ id: string; data: TestInstance } | null>>
  setShapPoint: Dispatch<SetStateAction<{ id: string; data: TestInstance } | null>>
  hashRow: (row: TestInstance) => string
  useUmap: boolean
  setuseUmap: Dispatch<SetStateAction<boolean>>
  options: string[]
  xAxisOption: string
  yAxisOption: string
  setXAxisOption: (value: string) => void
  setYAxisOption: (value: string) => void
}

const InstanceClassificationUmap = (props: Umapi) => {
  const theme = useTheme();
  const { point, setPoint, setShapPoint, showMisclassifiedOnly, hashRow, useUmap, setuseUmap, options, xAxisOption, yAxisOption, setXAxisOption, setYAxisOption } = props;
  const tab = useAppSelector((state: RootState) => state.workflowPage.tab);
  const raw = tab?.workflowTasks.modelAnalysis?.modelInstances.data;
  const parsedData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('xl'));

  const dispatch = useAppDispatch();

  const umapRows = Array.isArray(parsedData)
  ? parsedData.slice(0, 2000)
  : [];

  useEffect(() => {
    if (!umapRows.length) return;

    const umapPayload = umapRows.map((row) =>
      Object.values(row).map((val) => parseFloat(String(val))),
    );

    dispatch(
      fetchUmap({
        data: umapPayload,
        metadata: {
          workflowId: tab?.workflowId || '',
          query: 'umap',
        },
      }),
    );
  }, [raw]);

  const getVegaData = (data: unknown) => {
    return Array.isArray(data) && data?.map((originalRow) => {
      const id = hashRow(originalRow?.original);
      const isMisclassified = originalRow.actual !== originalRow.predicted;

      return {
        ...originalRow,
        isMisclassified,
        id,
      };
    });
  };

  const umapResult = tab?.workflowTasks.dataExploration?.umap?.data ?? [];
  const umapLoading = tab?.workflowTasks.dataExploration?.umap?.loading;
  
  const canRenderUmap =
    !umapLoading &&
    Array.isArray(umapResult) &&
    umapResult.length <= umapRows.length;
  
  const combinedPlotData = canRenderUmap
    ? umapResult
        .map((point: number[], index: number) => {
          const original = umapRows[index];
        
          if (!original) return null;
        
          return {
            x: point[0],
            y: point[1],
            original,
            actual: original.actual ?? '?',
            predicted: original.predicted ?? '?',
            index,
          };
        })
        .filter((row): row is {
          x: number;
          y: number;
          original: TestInstance;
          actual: unknown;
          predicted: unknown;
          index: number;
        } => row !== null)
    : [];

  const predictedValues = Array.from(
    new Set(combinedPlotData.map((d) => String(d.predicted)))
  );

  const classColorMap = getClassColorMap(predictedValues);

  const handleNewView = (view: View) => {
    view.addEventListener('click', (event: ScenegraphEvent, item: Item | null | undefined) => {
      if (item) {
        const clickedIndex = item.datum.index;
        const originalRow = parsedData[clickedIndex]; // This is the row you want

        const id = hashRow(originalRow);
        const { actual, predicted, ...rest } = originalRow;

        setPoint({
          id,
          data: {
            ...rest,
            actual,
            predicted,
          // index: clickedIndex,
          },
        });
        if(!showMisclassifiedOnly || !item.datum.isMisclassified) setShapPoint({
          id,
          data: {
            ...rest,
            actual,
            predicted,
          },
        });
        else setShapPoint(null);
      }
    });
  };

  const info = (
    <Loader/>
  );
  const shouldShowInfoMessage = umapLoading || !canRenderUmap;

  return (
    <ResponsiveCardVegaLite
      actions={false}
      spec={{
        width: 'container',
        height: 'container',
        autosize: { type: 'fit', contains: 'padding', resize: true },
        data: {
          values: getVegaData(combinedPlotData ?? []),
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
            name: 'panZoom',
            select: 'interval',
            bind: 'scales',
          },
          {
            name: 'selectedPoint',
            value: point?.id ?? null
          }
        ],
        mark: {
          type: 'point',
          filled: true,
          size: 100,
        },

        encoding: {
          x: { field: 'x', type: 'quantitative', axis: { title: null } },
          y: { field: 'y', type: 'quantitative', axis: { title: null } },

          color: showMisclassifiedOnly
            ? {
              field: 'isMisclassified',
              type: 'nominal',
              scale: {
                domain: [false, true],
                range: ['#cccccc', '#ff0000'],
              },
              legend: {
                title: 'Misclassified',
                labelExpr: 'datum.label === \'true\' ? \'Misclassified\' : \'Correct\'',
              },
            }
            : {
              field: 'predicted',
              type: 'nominal',
              scale: {
                domain: Object.keys(classColorMap),
                range: Object.values(classColorMap),
              },
              legend: {
                title: 'Predicted Class',
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
            { field: 'actual', type: 'nominal', title: 'Actual' },
            { field: 'predicted', type: 'nominal', title: 'Predicted' },

          ]
        },
      }}
      title={'Instance Classification Umap'}
      onNewView={handleNewView}
      infoMessage={info}
      showInfoMessage={shouldShowInfoMessage}
      aspectRatio={isSmallScreen ? 2.8 : 1.8}
      maxHeight={1200}
      isStatic={true}
      controlPanel={
        <InstanceScatterControls
          options={options}
          xAxisOption={xAxisOption}
          yAxisOption={yAxisOption}
          useUmap={useUmap}
          onXAxisChange={setXAxisOption}
          onYAxisChange={setYAxisOption}
          onUseUmapChange={setuseUmap}
        />
      }

    />
  );
};

export default InstanceClassificationUmap;
