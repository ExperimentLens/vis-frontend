import type { ReactNode } from 'react';
import {
  Box,
  TableCell,
  Typography,
} from '@mui/material';

import { MONO } from '../../../../shared/models/observability/agentic-conventions';

export const Th = ({
  children,
  align,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) => (
  <TableCell
    align={align}
    sx={{
      fontSize: '0.6rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      color: 'text.secondary',
      whiteSpace: 'nowrap',
      py: 0.75,
    }}
  >
    {children}
  </TableCell>
);

export const Td = ({
  children,
  align,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) => (
  <TableCell
    align={align}
    sx={{
      fontSize: '0.74rem',
      whiteSpace: 'nowrap',
      py: 0.5,
    }}
  >
    {children}
  </TableCell>
);

export const TruncMono = ({
  children,
  max = 160,
}: {
  children: string;
  max?: number;
}) => (
  <Box
    component="span"
    sx={{
      fontFamily: MONO,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: max,
      display: 'inline-block',
      verticalAlign: 'bottom',
    }}
    title={children}
  >
    {children}
  </Box>
);

export const BigNum = ({
  value,
  sub,
}: {
  value: string;
  sub: string;
}) => (
  <Box sx={{ mb: 1 }}>
    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>
      {value}
    </Typography>

    <Typography variant="caption" color="text.secondary">
      {sub}
    </Typography>
  </Box>
);