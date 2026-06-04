import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface ControlSectionProps {
  /** Small uppercase label for the group. */
  label: string;
  /** Optional leading icon shown next to the label. */
  icon?: ReactNode;
  children: ReactNode;
  /** Lay the children out in a row instead of stacking them. */
  row?: boolean;
}

/**
 * A labeled grouping for related controls inside a settings gear menu or an
 * inline control bar. Gives every control cluster the same compact, uppercase
 * caption header and consistent spacing, so grouped controls (e.g. the model
 * UMAP / projection options) stop looking ad-hoc.
 */
const ControlSection = ({ label, icon, children, row = false }: ControlSectionProps) => (
  <Box sx={{ width: '100%' }}>
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75, color: 'text.secondary' }}>
      {icon && <Box sx={{ display: 'inline-flex', color: 'primary.main' }}>{icon}</Box>}
      <Typography variant="captionLabel" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
    <Box
      sx={{
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        flexWrap: row ? 'wrap' : 'nowrap',
        gap: 1,
        // flex-start so a content-sized control (e.g. the projection
        // SegmentedToggle) hugs its buttons instead of stretching the track.
        alignItems: 'flex-start',
      }}
    >
      {children}
    </Box>
  </Box>
);

export default ControlSection;
