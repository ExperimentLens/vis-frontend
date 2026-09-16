import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import FindInPageRoundedIcon from '@mui/icons-material/FindInPageRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { EmptyNote } from './chart-kit';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { detectIssues, selectIssueScan } from '../../../../store/slices/observabilitySlice';
import { traceAnswer, traceQuestion } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import { CLEARS_CATEGORIES } from '../../../../shared/models/observability/issue-scan';
import type { ClearsCategory, DetectedIssue } from '../../../../shared/models/observability/issue-scan';

interface Props {
  details: TraceDetail[];
  runNameById?: Record<string, string>;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: '#0288d1',
  medium: '#ed6c02',
  high: '#dc2626',
};

// A local model scanning traces one at a time is slow — cap the sample so a
// click doesn't accidentally kick off a 10-minute run over hundreds of traces.
const DEFAULT_SAMPLE_SIZE = 15;

export default function DetectIssuesPanel({ details, runNameById }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { experimentId } = useParams();
  const { data, loading, error } = useAppSelector(selectIssueScan);

  const [model, setModel] = useState('llama3.2');
  const [sampleSize, setSampleSize] = useState(DEFAULT_SAMPLE_SIZE);
  const [categories, setCategories] = useState<ClearsCategory[]>([...CLEARS_CATEGORIES]);
  // Collapsed-by-name, not collapsed-by-default — a category only enters this
  // set once the user hides it, so a fresh scan opens every group.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const sessionByTraceId = useMemo(
    () => new Map(details.map(t => [t.id, t.sessionId])),
    [details],
  );

  const traceById = useMemo(
    () => new Map(details.map(t => [t.id, t])),
    [details],
  );

  const toggleCategory = (c: ClearsCategory) =>
    setCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  const toggleCategoryCollapsed = (category: string) =>
    setCollapsedCategories(prev => {
      const next = new Set(prev);

      if (next.has(category)) next.delete(category);
      else next.add(category);

      return next;
    });

  const runScan = () => {
    const sample = [...details]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, sampleSize);

    dispatch(detectIssues({
      traces: sample.map(t => ({ traceId: t.id, question: traceQuestion(t), answer: traceAnswer(t) })),
      categories,
      model,
    }));
  };

  const issuesByCategory = useMemo(() => {
    const m = new Map<string, DetectedIssue[]>();

    (data?.issues ?? []).forEach(issue => {
      const key = issue.category ?? 'Other';
      const arr = m.get(key) ?? [];

      arr.push(issue);
      m.set(key, arr);
    });

    return m;
  }, [data]);

  const cardDetails = data
    ? `Scanned ${data.scannedCount} trace${data.scannedCount === 1 ? '' : 's'} · ${data.issues.length} issue${data.issues.length === 1 ? '' : 's'} found${data.failedTraceIds.length > 0 ? ` · ${data.failedTraceIds.length} failed to scan` : ''}`
    : 'Local LLM judge — CLEARS framework';

  return (
    <ResponsiveCardTable
      title="Detect issues"
      details={cardDetails}
      optionsLabel="Scan settings"
      optionsIcon={<FindInPageRoundedIcon fontSize="small" />}
      showDownloadButton={false}
      showFullScreenButton={false}
      headerActions={
        <Button
          size="small"
          variant="contained"
          disabled={loading || categories.length === 0 || details.length === 0}
          onClick={runScan}
          startIcon={loading ? <CircularProgress size={12} color="inherit" /> : <FindInPageRoundedIcon sx={{ fontSize: '16px !important' }} />}
          sx={{ fontSize: '0.7rem' }}
        >
          {loading ? `Scanning ${Math.min(sampleSize, details.length)}…` : `Scan ${Math.min(sampleSize, details.length)} traces`}
        </Button>
      }
      controlPanel={
        <Stack spacing={1.25} sx={{ width: '100%' }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Ollama model
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={model}
              onChange={e => setModel(e.target.value)}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Sample size
            </Typography>
            <TextField
              size="small"
              fullWidth
              type="number"
              value={sampleSize}
              onChange={e => setSampleSize(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Categories (CLEARS)
            </Typography>
            <Stack sx={{ pl: 0.5 }}>
              {CLEARS_CATEGORIES.map(c => (
                <FormControlLabel
                  key={c}
                  control={<Checkbox size="small" checked={categories.includes(c)} onChange={() => toggleCategory(c)} />}
                  label={<Typography variant="caption">{c}</Typography>}
                  sx={{ mr: 0 }}
                />
              ))}
            </Stack>
          </Box>

          {/* <Typography variant="caption" color="text.secondary">
            Runs against your local Ollama instance ({model || 'default model'}) one trace at a time — this can take a while.
          </Typography> */}
        </Stack>
      }
    >
      {error && (
        <Typography variant="bodySm" sx={{ color: 'error.main', p: 1.5 }}>{error}</Typography>
      )}

      {!error && !data && !loading && (
        <Box sx={{ p: 1.5 }}>
          <EmptyNote>No scan run yet — open scan settings and run above.</EmptyNote>
        </Box>
      )}

      {data && (
        <Stack spacing={1} sx={{ p: 1.5 }}>
          {data.issues.length === 0 ? (
            <EmptyNote>No issues found in this sample.</EmptyNote>
          ) : (
            Array.from(issuesByCategory.entries()).map(([category, issues]) => {
              const collapsed = collapsedCategories.has(category);

              return (
              <Box key={category}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  onClick={() => toggleCategoryCollapsed(category)}
                  sx={{ cursor: 'pointer', mb: 0.5, userSelect: 'none' }}
                >
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    {category} · {issues.length}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={collapsed ? `Show ${category} issues` : `Hide ${category} issues`}
                    sx={{ p: 0.25 }}
                  >
                    <ExpandMoreRoundedIcon
                      sx={{
                        fontSize: 18,
                        color: 'text.secondary',
                        transform: collapsed ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  </IconButton>
                </Stack>
                <Collapse in={!collapsed}>
                <Stack spacing={0.5}>
                  {issues.map((issue, i) => {
                    const color = SEVERITY_COLOR[issue.severity ?? 'medium'] ?? SEVERITY_COLOR.medium;
                    const sessionId = sessionByTraceId.get(issue.traceId);
                    const traceName = traceById.get(issue.traceId)?.name ?? issue.traceId;
                    const workflowName = sessionId ? (runNameById?.[sessionId] ?? sessionId) : null;

                    return (
                      <Box
                        key={`${issue.traceId}-${i}`}
                        sx={{
                          p: 0.75,
                          borderRadius: 1.5,
                          bgcolor: alpha(color, 0.08),
                          border: `1px solid ${alpha(color, 0.25)}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 0.75,
                        }}
                      >
                        <WarningAmberRoundedIcon sx={{ fontSize: 14, color, mt: 0.15, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                            {issue.severity && (
                              <Chip size="small" label={issue.severity} sx={{ height: 15, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(color, 0.15), color, flexShrink: 0 }} />
                            )}
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                              title={traceName}
                            >
                              {traceName}
                            </Typography>
                            {workflowName && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}
                                title={workflowName}
                              >
                                · {workflowName}
                              </Typography>
                            )}
                            {experimentId && sessionId && (
                              <Typography
                                variant="caption"
                                onClick={() => navigate(`/${experimentId}/workflow?workflowId=${sessionId}&traceId=${issue.traceId}`)}
                                sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 700, flexShrink: 0, '&:hover': { textDecoration: 'underline' } }}
                              >
                                View trace
                              </Typography>
                            )}
                          </Stack>
                          <Typography variant="bodySm" sx={{ display: 'block', mt: 0.25 }}>
                            {issue.explanation || 'No explanation given.'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
                </Collapse>
              </Box>
              );
            })
          )}
        </Stack>
      )}
    </ResponsiveCardTable>
  );
}
