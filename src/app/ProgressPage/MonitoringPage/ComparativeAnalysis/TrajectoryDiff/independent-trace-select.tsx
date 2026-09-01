import { useMemo } from 'react';
import {
  alpha,
  Box,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';

interface IndependentTraceSelectProps {
  runIds: string[];
  colorById: Record<string, string>;
  detailsByRun: Record<string, TraceDetail[]>;
  selectedIdByRun: Record<string, string>;
  onSelect: (runId: string, traceId: string) => void;
}

const traceLabel = (t: TraceDetail) => t.name;

const Dot = ({ color }: { color: string }) => (
  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
);

// A single dropdown covering every selected workflow at once: each workflow
// gets a header (color dot + name) followed by its traces, so picking a
// trace for one run doesn't require a separate Select per run.
export default function IndependentTraceSelect({
  runIds,
  colorById,
  detailsByRun,
  selectedIdByRun,
  onSelect,
}: IndependentTraceSelectProps) {
  const value = useMemo(
    () => runIds.map(id => selectedIdByRun[id]).filter((v): v is string => Boolean(v)),
    [runIds, selectedIdByRun],
  );

  const traceToRun = useMemo(() => {
    const map: Record<string, string> = {};

    runIds.forEach(id => (detailsByRun[id] ?? []).forEach(t => { map[t.id] = id; }));

    return map;
  }, [runIds, detailsByRun]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const newValue = event.target.value as string[];
    const added = newValue.find(v => !value.includes(v));

    if (!added) return;

    const runId = traceToRun[added];

    if (runId) onSelect(runId, added);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 300, maxWidth: 560 }}>
      <InputLabel id="traj-manual-multi">Traces per workflow</InputLabel>
      <Select
        labelId="traj-manual-multi"
        label="Traces per workflow"
        multiple
        value={value}
        onChange={handleChange}
        sx={{ '& .MuiSelect-select': { py: 0.625 } }}
        renderValue={selected => (
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {runIds
              .filter(id => (selected as string[]).includes(selectedIdByRun[id]))
              .map(id => {
                const trace = (detailsByRun[id] ?? []).find(t => t.id === selectedIdByRun[id]);

                if (!trace) return null;

                const color = colorById[id] ?? '#999';

                return (
                  <Chip
                    key={id}
                    size="small"
                    label={
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Dot color={color} />
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {traceLabel(trace)}
                        </Box>
                      </Stack>
                    }
                    sx={{
                      height: 24,
                      maxWidth: 260,
                      borderRadius: '999px',
                      fontWeight: 500,
                      bgcolor: alpha(color, 0.12),
                      border: `1px solid ${alpha(color, 0.4)}`,
                      color: 'text.primary',
                      '& .MuiChip-label': { display: 'flex', alignItems: 'center', px: 1 },
                    }}
                  />
                );
              })}
          </Stack>
        )}
        MenuProps={{
          PaperProps: {
            style: { maxHeight: 420, width: 360 },
          },
        }}
      >
        {runIds.flatMap(id => {
          const traces = detailsByRun[id] ?? [];
          const header = (
            <ListSubheader key={`h-${id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, lineHeight: '32px' }}>
              <Dot color={colorById[id] ?? '#999'} />
              {id}
            </ListSubheader>
          );

          const items = traces.length
            ? traces.map(t => (
                <MenuItem key={t.id} value={t.id} dense sx={{ fontSize: '0.78rem', pl: 2 }}>
                  <Checkbox checked={selectedIdByRun[id] === t.id} size="small" sx={{ p: 0.5 }} />
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {traceLabel(t)}
                  </Box>
                </MenuItem>
              ))
            : [
                <MenuItem key={`empty-${id}`} disabled dense sx={{ pl: 2, fontStyle: 'italic', opacity: 0.6 }}>
                  No traces
                </MenuItem>,
              ];

          return [header, ...items];
        })}
      </Select>
    </FormControl>
  );
}
