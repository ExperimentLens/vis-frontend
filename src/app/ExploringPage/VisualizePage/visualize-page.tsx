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
import { getDataSource } from '../../../store/slices/exploring/datasourceSlice';
import { resetChartState } from '../../../store/slices/exploring/chartSlice';
import {
  resetMapState,
  setDrawnShape,
  setMapLayer,
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
  const { previousMapLayer } = useAppSelector((state: RootState) => state.map);

  const handleClosePredictionDisplay = () => {
    dispatch(setPredictionDisplay(false));
    dispatch(setZone({}));
    dispatch(setDrawnShape(null));
    dispatch(setMapLayer(previousMapLayer));
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
              backgroundColor: theme => theme.palette.primary.main,
              opacity: 0.8,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" textAlign="center" color={theme => theme.palette.background.paper}>
                Prediction Display
              </Typography>
            </Box>
            <Box sx={{ position: 'absolute', right: 16 }}>
              <Button onClick={handleClosePredictionDisplay}>
                <CloseIcon
                  sx={{ color: theme => theme.palette.background.paper }}
                />
              </Button>
            </Box>
          </Box>
        </>
      ) : null}
      <Map id={datasetId} dataset={dataset} />
      {!predictionDisplay && <BottomBar dataset={dataset} />}
    </>
  );
};

export default VisualizePage;
