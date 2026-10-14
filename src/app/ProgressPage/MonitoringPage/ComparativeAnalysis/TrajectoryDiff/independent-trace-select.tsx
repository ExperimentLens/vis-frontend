import { useMemo } from 'react';
import {
  Box,
  Checkbox,
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
  runNameById: Record<string, string>;
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
  runNameById,
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

  // Runs logged with the SDK hold one trace each, so there is nothing to pick.
  if (runIds.every(id => (detailsByRun[id] ?? []).length <= 1)) return null;

  return (
    <FormControl size="small" sx={{ width: 360, maxWidth: '100%' }}>
      <InputLabel id="traj-manual-multi">Traces per workflow</InputLabel>
      <Select
        labelId="traj-manual-multi"
        label="Traces per workflow"
        multiple
        value={value}
        onChange={handleChange}
        sx={{ '& .MuiSelect-select': { py: 0.625 } }}
        // One line however many runs are compared: a chip per run wrapped into a tall block.
        renderValue={selected => {
          const picked = runIds
            .map(id => (detailsByRun[id] ?? []).find(t => t.id === selectedIdByRun[id]))
            .filter((t): t is TraceDetail => Boolean(t) && (selected as string[]).includes(t!.id));
          const names = [...new Set(picked.map(traceLabel))];

          return (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Stack direction="row" sx={{ flexShrink: 0 }}>
                {runIds.slice(0, 6).map((id, i) => (
                  <Box key={id} sx={{ ml: i ? -0.5 : 0, border: 1, borderColor: 'background.paper', borderRadius: '50%', display: 'flex' }}>
                    <Dot color={colorById[id] ?? '#999'} />
                  </Box>
                ))}
              </Stack>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                {names.length === 1 ? names[0] : `${names.length} different traces`}
                <Box component="span" sx={{ color: 'text.secondary' }}>{` · ${picked.length} of ${runIds.length} runs`}</Box>
              </Box>
            </Stack>
          );
        }}
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
              {runNameById[id] ?? id}
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
