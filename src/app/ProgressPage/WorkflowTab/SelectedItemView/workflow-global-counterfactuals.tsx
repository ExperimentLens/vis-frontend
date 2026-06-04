import { useEffect, useMemo, useRef, useState } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import {
  Button,
  Select,
  MenuItem,
  Box,
  InputLabel,
  FormControl,
  OutlinedInput,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import GlovesScatter from '../../../Tasks/ModelAnalysisTask/plots/gloves-scatter';
import GlovesMetricSummary from './gloves-metric-summary';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { fetchAffected } from '../../../../store/slices/modelAnalysisSlice';
import { fetchModelAnalysisExplainabilityPlot, setActionChoiceStrategy, setCfMethod, setGcfSize } from '../../../../store/slices/explainabilitySlice';
import { useParams } from 'react-router-dom';
import Loader from '../../../../shared/components/loader';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { logger } from '../../../../shared/utils/logger';

const CGlanceExecution = () => {
  const { experimentId } = useParams();
  const availableCfMethods = useMemo(
    () => ['Dice', 'NearestNeighbors', 'RandomSampling'],
    [],
  );
  const availableActionStrategies = ['max-eff', 'min-cost', 'mean-action'];
  const cfMethod = useAppSelector(state => state.workflowPage.tab?.workflowTasks?.modelAnalysis?.global_counterfactuals_control_panel.cfMethod);
  const actionChoiceStrategy = useAppSelector(state => state.workflowPage.tab?.workflowTasks?.modelAnalysis?.global_counterfactuals_control_panel.actionChoiceStrategy);
  const gcfSize = useAppSelector(state => state.workflowPage.tab?.workflowTasks?.modelAnalysis?.global_counterfactuals_control_panel.gcfSize);

  const tab = useAppSelector(state => state.workflowPage.tab);
  const globalCounterfactualsData = useAppSelector(
    (state) =>
      state.workflowPage.tab?.workflowTasks?.modelAnalysis?.global_counterfactuals
  );
  const isLoading = globalCounterfactualsData?.loading === true;

  const dispatch = useAppDispatch();

  const hasFetchedOnce = useRef(false);
  const [configExpanded, setConfigExpanded] = useState(true);

  useEffect(() => {
    if (
      hasFetchedOnce.current ||
    !cfMethod ||
    !actionChoiceStrategy ||
    !gcfSize ||
    !tab?.workflowId ||
    !experimentId
    ) {
      return;
    }

    hasFetchedOnce.current = true;

    const runInitialFetch = async () => {
      await fetchData();
    };

    runInitialFetch();
  }, [cfMethod, actionChoiceStrategy, gcfSize, tab?.workflowId, experimentId]);

  const counterfactualsContent = () => {
    if(isLoading) return <Loader />;
    if (globalCounterfactualsData?.error)
      return (
        <InfoMessage
          message="Error loading global counterfactuals."
          type="info"
          fullHeight
        />
      );

    if(!globalCounterfactualsData?.data)
      return (
        <InfoMessage
          message="Please select a configuration."
          type="info"
          fullHeight
        />
      );

    const globalData = tab?.workflowTasks?.modelAnalysis?.global_counterfactuals?.data;
    const affectedData = tab?.workflowTasks?.modelAnalysis?.affected?.data;

    const hasAllData =
        !!globalData?.affectedClusters &&
        !!affectedData &&
        !!globalData?.actions &&
        !!globalData?.effCostActions;

    return (
      <Box>
        <GlovesMetricSummary />
        {hasAllData && (
          <GlovesScatter
            data1={globalData.affectedClusters}
            data2={affectedData}
            actions={globalData.actions}
            eff_cost_actions={globalData.effCostActions}
          />
        )}
      </Box>
    );
  };

  const fetchData = async () => {
    try {
      setConfigExpanded(false);
      // Dispatch global_counterfactuals
      await dispatch(
        fetchModelAnalysisExplainabilityPlot({
          query: {
            explanation_type: 'featureExplanation',
            explanation_method: 'global_counterfactuals',

            gcf_size: gcfSize,
            cfGenerator: cfMethod,
            clusterActionChoiceAlgo: actionChoiceStrategy,
          },
          metadata: {
            experimentId: experimentId || '',
            workflowId: tab?.workflowId || '',
            queryCase: 'global_counterfactuals',
          },
        }),
      );

      // Dispatch affected
      await dispatch(
        fetchAffected({
          workflowId: tab?.workflowId || '',
          queryCase: 'affected',
        }),
      );

      logger.log(
        'Dispached global_counterfactuals and affected successfully.',
      );
    } catch (error) {
      logger.log('Error dispatching data:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Accordion
        expanded={configExpanded}
        onChange={(_e, expanded) => setConfigExpanded(expanded)}
        disableGutters
        elevation={0}
        sx={{
          border: theme => `1px solid ${theme.palette.divider}`,
          borderRadius: '12px',
          mx: 2,
          mt: 1,
          '&:before': { display: 'none' },
          backgroundColor: 'background.paper',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 2,
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              my: 0.5,
            },
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <TuneIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Configuration
              </Typography>
            </Stack>
            {!configExpanded && (
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                <Chip size="small" label={`Actions: ${gcfSize ?? '—'}`} variant="outlined" />
                <Chip size="small" label={`Method: ${cfMethod ?? '—'}`} variant="outlined" />
                <Chip size="small" label={`Strategy: ${actionChoiceStrategy ?? '—'}`} variant="outlined" />
              </Stack>
            )}
          </Stack>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<PlayArrowIcon />}
            onClick={(e) => {
              e.stopPropagation();
              fetchData();
            }}
            sx={{ mr: 1 }}
          >
            Run
          </Button>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            <Box flex={1}>
              <FormControl fullWidth size="small">
                <Tooltip
                  title="The number of actions to be generated in the end of the algorithm"
                  style={{ width: '100%' }}
                >
                  <InputLabel id="gcf-size-select-label">
                    Number of CounterFactual Actions
                  </InputLabel>
                </Tooltip>
                <Select
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 224, width: 250 } },
                  }}
                  labelId="gcf-size-select-label"
                  input={<OutlinedInput label="Number of CounterFactual Actions" />}
                  value={gcfSize}
                  onChange={(event: SelectChangeEvent<number | string>) =>
                    dispatch(setGcfSize(Number(event.target.value)))
                  }
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(value => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box flex={1}>
              <FormControl fullWidth size="small">
                <Tooltip
                  title="Methods that generate candidate counterfactual explanations"
                  style={{ width: '100%' }}
                >
                  <InputLabel id="cf-method-select-label">
                    Local Counterfactual Method
                  </InputLabel>
                </Tooltip>
                <Select
                  labelId="cf-method-select-label"
                  input={<OutlinedInput label="Local Counterfactual Method" />}
                  value={cfMethod}
                  onChange={e => dispatch(setCfMethod(e.target.value as string))}
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 224, width: 250 } },
                  }}
                >
                  {availableCfMethods.map(method => (
                    <MenuItem key={method} value={method}>
                      {method}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box flex={1}>
              <FormControl fullWidth size="small">
                <Tooltip
                  title="Different strategies for selecting the best actions from the generated counterfactuals based on different criteria"
                  style={{ width: '100%' }}
                >
                  <InputLabel id="action-choice-strategy-select-label">
                    Action Choice Strategy
                  </InputLabel>
                </Tooltip>
                <Select
                  MenuProps={{
                    PaperProps: { style: { maxHeight: 224, width: 250 } },
                  }}
                  labelId="action-choice-strategy-select-label"
                  input={<OutlinedInput label="Action Choice Strategy" />}
                  value={actionChoiceStrategy}
                  onChange={e =>
                    dispatch(setActionChoiceStrategy(e.target.value as string))
                  }
                >
                  {availableActionStrategies.map(strategy => (
                    <MenuItem key={strategy} value={strategy}>
                      {strategy}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Divider
        sx={{
          my: 1,
          borderBottomWidth: 1,
          borderColor: 'divider',
        }}
      />
      <Box sx={{ flexGrow: 1, p: 1 }}>
        {counterfactualsContent()}
      </Box>
    </Box>
  );
};

export default CGlanceExecution;
