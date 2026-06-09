import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PsychologyAltRoundedIcon from '@mui/icons-material/PsychologyAltRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import { useEffect, useMemo, useState } from 'react';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';

import WorkflowDetailsAccordion from './WorkflowDetailsAccordition';
import ModelInsightsAccordion from './ModelInsightsAccordition';
import TracesAccordion from './TracesAccordion';
import { hasModelExplainability, useExperimentCapabilities } from '../../../../shared/utils/experimentCapabilities';

export default function WorkflowTreeView() {
  const { tab } = useAppSelector((s: RootState) => s.workflowPage);
  const { traces: hasTraces } = useExperimentCapabilities();

  const hasExplainability = useMemo(
    () => hasModelExplainability(
      tab?.workflowConfiguration.tasks,
      tab?.workflowConfiguration.dataAssets,
    ),
    [tab?.workflowConfiguration.tasks, tab?.workflowConfiguration.dataAssets],
  );

  const [workflowExpanded, setWorkflowExpanded] = useState(true);
  const [modelExpanded, setModelExpanded] = useState<boolean>(hasExplainability);
  const [tracesExpanded, setTracesExpanded] = useState(true);

  const theme = useTheme();

  useEffect(() => setModelExpanded(hasExplainability), [hasExplainability]);

  if (!tab?.workflowConfiguration) return null;

  return (
    <Box sx={{ overflow: 'auto' }}>
      {/* Workflow Details */}
      <Accordion
        expanded={workflowExpanded}
        disableGutters
        sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
      >
        <AccordionSummary
          onClick={(e) => e.stopPropagation()}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', pointerEvents: 'none' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', pointerEvents: 'auto', cursor: 'default' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountTreeIcon color="primary" />
              <Typography fontWeight={600}>Workflow Details</Typography>
            </Box>
            <Box
              onClick={(e) => { e.stopPropagation(); setWorkflowExpanded(p => !p); }}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ExpandMoreIcon />
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <WorkflowDetailsAccordion />
        </AccordionDetails>
      </Accordion>

      {/* Both sections always render so a workflow with ML artifacts AND traces shows
          both. LLM Traces has its own empty-state; Model Insights is grayed out when
          there is no (tabular) model to explain. */}
      <Accordion
        expanded={tracesExpanded && hasTraces}
        disableGutters
        sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
      >
        <AccordionSummary
          disabled={!hasTraces}
          onClick={(e) => e.stopPropagation()}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', pointerEvents: 'none' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', pointerEvents: 'auto', cursor: 'default' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HubRoundedIcon color="primary" />
              <Typography fontWeight={600} sx={{ color: hasTraces ? 'inherit' : theme.palette.text.disabled }}>
                LLM Traces
              </Typography>
            </Box>
            <Box
              onClick={(e) => { e.stopPropagation(); if (hasTraces) setTracesExpanded(p => !p); }}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ExpandMoreIcon />
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <TracesAccordion />
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={modelExpanded && hasExplainability}
        disableGutters
        sx={{ boxShadow: 'none', '&::before': { display: 'none' } }}
      >
        <AccordionSummary
          disabled={!hasExplainability}
          onClick={(e) => e.stopPropagation()}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', pointerEvents: 'none' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%', pointerEvents: 'auto', cursor: 'default' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyAltRoundedIcon color="primary" />
              <Typography fontWeight={600} sx={{ color: hasExplainability ? 'inherit' : theme.palette.text.disabled }}>
                Model Insights
              </Typography>
            </Box>
            <Box
              onClick={(e) => { e.stopPropagation(); if (hasExplainability) setModelExpanded(p => !p); }}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ExpandMoreIcon />
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <ModelInsightsAccordion />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
