import './visualize.css';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import {
  type RootState,
  useAppDispatch,
  useAppSelector,
} from '../../../store/store';
import {
  postFileMeta,
  resetDatasetState,
} from '../../../store/slices/exploring/datasetSlice';
import Loader from '../../../shared/components/loader';
import { Map } from './Map/map';
import { VisControl } from './VisControl/vis-control';
import { getDataSource } from '../../../store/slices/exploring/datasourceSlice';
import { resetChartState } from '../../../store/slices/exploring/chartSlice';
import {
  resetMapState,
  setDrawnShape,
} from '../../../store/slices/exploring/mapSlice';
import { resetStatsState } from '../../../store/slices/exploring/statsSlice';
import { resetTimeSeriesState } from '../../../store/slices/exploring/timeSeriesSlice';
import {
  resetZoneState,
  setZone,
} from '../../../store/slices/exploring/zoneSlice';
import {
  resetPredictionState,
  setPredictionDisplay,
} from '../../../store/slices/exploring/predictionSlice';
import CloseIcon from '@mui/icons-material/Close';
import { PredictionTimeline } from './Map/PredictionTimeline/prediction-timeline';
import { BottomBar } from './bottom-bar';

const VisualizePage = () => {
  const { datasetId } = useParams();
  const dispatch = useAppDispatch();
  const { menuOptions } = useAppSelector(
    (state: RootState) => state.progressPage,
  );
  const { dataset, loading } = useAppSelector(
    (state: RootState) => state.dataset,
  );
  const {
    dataSource,
    loading: { fetch: dataSourceLoading },
  } = useAppSelector((state: RootState) => state.dataSource);
  const { predictionDisplay } = useAppSelector(
    (state: RootState) => state.prediction,
  );

  const handleClosePredictionDisplay = () => {
    dispatch(setPredictionDisplay(false));
    dispatch(setZone({}));
    dispatch(setDrawnShape(null));
  };

  useEffect(() => {
    if (datasetId && !dataSource) {
      dispatch(getDataSource({ datasetId }));
    }

    return () => {
      dispatch(resetMapState());
      dispatch(resetDatasetState());
      dispatch(resetChartState());
      dispatch(resetStatsState());
      dispatch(resetTimeSeriesState());
      dispatch(resetZoneState());
      dispatch(resetPredictionState());
    };
  }, []);

  useEffect(() => {
    if (datasetId && dataSource) {
      dispatch(
        postFileMeta({
          body: dataSource,
        }),
      );
    }
  }, [datasetId, dataSource]);

  if (loading.postFileMeta || !datasetId || dataSourceLoading) {
    return <Loader />;
  }

  return (
    <>
      {predictionDisplay ? (
        <>
          <Box
            position="absolute"
            bottom={20}
            zIndex={999}
            sx={{
              left: menuOptions.collapsed
                ? 'calc(56px + (100vw - 56px) / 2)'
                : 'calc(calc(15% + 16px) + (100vw - calc(15% + 16px)) / 2)',
              transform: 'translateX(-50%)',
            }}
          >
            <PredictionTimeline />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'secondary.main',
              position: 'relative',
            }}
          >
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Typography variant="h6" textAlign="center">
                Prediction Display
              </Typography>
            </Box>
            <Box sx={{ position: 'absolute', right: 16 }}>
              <Button onClick={handleClosePredictionDisplay}>
                <CloseIcon />
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        <Box
          position="absolute"
          zIndex={999}
          top={predictionDisplay ? 32 : 0}
          sx={{ p: 2, minWidth: 200 }}
        >
          <VisControl dataset={dataset} />
        </Box>
      )}
      <Map id={datasetId} dataset={dataset} />
      <BottomBar dataset={dataset} />
    </>
  );
};

export default VisualizePage;
