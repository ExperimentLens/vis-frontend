import { useState } from 'react';
import { Box, Button, Chip, TextField, Typography, alpha } from '@mui/material';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import type { Score } from '../../../shared/models/observability/score';
import type { ScoreDimension } from './score-dimensions';
import { SCORE_DIMENSIONS, TONE_COLOR, dimensionByName, dimensionLabel, scoreTone } from './score-dimensions';

// Shared docked "Annotate" control — config-driven score dimensions
// (numeric/categorical/boolean), not a single free-typed rating. Used both
// for span-level (Workflow Tab, Graph comparison) and trace-level annotation.

export interface AnnotationSavePayload {
  name: string
  dataType: 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN'
  value?: number
  stringValue?: string
  comment?: string
}

interface Props {
  scores: Score[]
  targetLabel: string
  onSave: (payload: AnnotationSavePayload) => void
  saving: boolean
}

const scoreDisplay = (score: Score): string => {
  const dim = dimensionByName(score.name);
  const label = dimensionLabel(score.name);

  if (dim?.type === 'boolean' || score.dataType === 'BOOLEAN') {
    return `${label}: ${score.value === 1 ? 'Yes' : 'No'}`;
  }
  if (dim?.type === 'categorical' || score.dataType === 'CATEGORICAL') {
    return `${label}: ${score.stringValue ?? '—'}`;
  }

  return `${label}: ${score.value ?? '—'}`;
};

const AnnotateForm = ({ scores, targetLabel, onSave, saving }: Props) => {
  const [open, setOpen] = useState(false);
  const [dimension, setDimension] = useState<ScoreDimension>(SCORE_DIMENSIONS[0]);
  const [numericValue, setNumericValue] = useState<number | null>(null);
  const [boolValue, setBoolValue] = useState<boolean | null>(null);
  const [categoryValue, setCategoryValue] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const resetForm = () => {
    setNumericValue(null);
    setBoolValue(null);
    setCategoryValue(null);
    setComment('');
  };

  const canSave =
    (dimension.type === 'numeric' && numericValue !== null) ||
    (dimension.type === 'boolean' && boolValue !== null) ||
    (dimension.type === 'categorical' && categoryValue !== null);

  const handleSave = () => {
    if (!canSave) return;

    if (dimension.type === 'categorical') {
      onSave({ name: dimension.name, dataType: 'CATEGORICAL', stringValue: categoryValue ?? undefined, comment: comment || undefined });
    } else if (dimension.type === 'boolean') {
      onSave({ name: dimension.name, dataType: 'BOOLEAN', value: boolValue ? 1 : 0, comment: comment || undefined });
    } else {
      onSave({ name: dimension.name, dataType: 'NUMERIC', value: numericValue ?? undefined, comment: comment || undefined });
    }
    setOpen(false);
    resetForm();
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        {scores.map(s => {
          const tone = scoreTone(s);
          const color = TONE_COLOR[tone];

          return (
            <Chip
              key={s.id}
              size="small"
              label={scoreDisplay(s) + (s.comment ? ` — ${s.comment}` : '')}
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: tone === 'good' ? 400 : 700,
                bgcolor: alpha(color, 0.1),
                color,
                border: tone === 'bad' ? `1px solid ${alpha(color, 0.4)}` : 'none',
              }}
            />
          );
        })}
        <Button
          size="small"
          startIcon={<RateReviewRoundedIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => setOpen(o => !o)}
          sx={{ fontSize: '0.68rem', py: 0.25 }}
        >
          Annotate {targetLabel}
        </Button>
      </Box>

      {open && (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: 1.5, border: theme => `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
          <Typography variant="statLabel" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            Dimension
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
            {SCORE_DIMENSIONS.map(d => (
              <Chip
                key={d.name}
                size="small"
                label={d.label}
                onClick={() => { setDimension(d); resetForm(); }}
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: dimension.name === d.name ? '#3766AF' : 'transparent',
                  color: dimension.name === d.name ? '#ffffff' : 'text.secondary',
                  border: theme => `1px solid ${dimension.name === d.name ? '#3766AF' : theme.palette.divider}`,
                }}
              />
            ))}
          </Box>

          {dimension.type === 'numeric' && (
            <>
              <Typography variant="statLabel" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                {dimension.label} ({dimension.min}–{dimension.max})
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                {Array.from({ length: (dimension.max ?? 5) - (dimension.min ?? 1) + 1 }, (_, i) => (dimension.min ?? 1) + i).map(n => (
                  <Box
                    key={n}
                    onClick={() => setNumericValue(n)}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      bgcolor: numericValue === n ? '#3766AF' : 'transparent',
                      color: numericValue === n ? '#ffffff' : 'text.secondary',
                      border: theme => `1px solid ${numericValue === n ? '#3766AF' : theme.palette.divider}`,
                    }}
                  >
                    {n}
                  </Box>
                ))}
              </Box>
            </>
          )}

          {dimension.type === 'boolean' && (
            <>
              <Typography variant="statLabel" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                {dimension.label}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
                <Chip
                  size="small"
                  label="Yes"
                  onClick={() => setBoolValue(true)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: boolValue === true ? '#16a34a' : 'transparent',
                    color: boolValue === true ? '#ffffff' : 'text.secondary',
                    border: theme => `1px solid ${boolValue === true ? '#16a34a' : theme.palette.divider}`,
                  }}
                />
                <Chip
                  size="small"
                  label="No"
                  onClick={() => setBoolValue(false)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: boolValue === false ? '#dc2626' : 'transparent',
                    color: boolValue === false ? '#ffffff' : 'text.secondary',
                    border: theme => `1px solid ${boolValue === false ? '#dc2626' : theme.palette.divider}`,
                  }}
                />
              </Box>
            </>
          )}

          {dimension.type === 'categorical' && (
            <>
              <Typography variant="statLabel" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                {dimension.label}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {(dimension.options ?? []).map(opt => (
                  <Chip
                    key={opt}
                    size="small"
                    label={opt}
                    onClick={() => setCategoryValue(opt)}
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      bgcolor: categoryValue === opt ? '#3766AF' : 'transparent',
                      color: categoryValue === opt ? '#ffffff' : 'text.secondary',
                      border: theme => `1px solid ${categoryValue === opt ? '#3766AF' : theme.palette.divider}`,
                    }}
                  />
                ))}
              </Box>
            </>
          )}

          <TextField
            size="small"
            fullWidth
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            minRows={2}
            sx={{ mb: 1, '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={() => { setOpen(false); resetForm(); }} sx={{ fontSize: '0.68rem' }}>Cancel</Button>
            <Button
              size="small"
              variant="contained"
              disabled={!canSave || saving}
              onClick={handleSave}
              sx={{ fontSize: '0.68rem' }}
            >
              {saving ? 'Saving…' : 'Save annotation'}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AnnotateForm;
