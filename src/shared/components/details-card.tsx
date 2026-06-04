import type React from 'react';
import { Box, Card, CardContent, CardHeader, Typography, Divider } from '@mui/material';
import { cardSurfaceSx, cardHeaderSx } from '../styles/card-surface';

interface DetailsCardProps {
  title: string;
  children: React.ReactNode;
  minWidth?: string;
  /** Optional accent color painted as a thin stripe along the top edge. */
  accent?: string;
}

export const DetailsCard = ({
  title,
  children,
  minWidth = '20%',
  accent,
}: DetailsCardProps) => (
  <Card
    elevation={0}
    sx={[
      cardSurfaceSx({ accent }),
      { minWidth, height: '100%' },
    ]}
  >
    <CardHeader
      title={
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
      }
      sx={cardHeaderSx()}
    />
    <CardContent
      sx={{
        bgcolor: 'customSurface.cardContent',
        py: 1.5,
        px: 2,
        '&:last-child': {
          paddingBottom: 2
        },
      }}
    >
      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </Box>
    </CardContent>
  </Card>
);

interface DetailsCardItemProps {
  label: string;
  value?: React.ReactNode;
}

export const DetailsCardItem = ({ label, value }: DetailsCardItemProps) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Box sx={{ flexGrow: 1 }}>{value}</Box>
    </Box>
    <Divider sx={{ mt: 1, opacity: 0.6 }} />
  </Box>
);
