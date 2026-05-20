import type React from 'react';
import { Box, Card, CardContent, CardHeader, Typography, Divider } from '@mui/material';

interface DetailsCardProps {
  title: string;
  children: React.ReactNode;
  minWidth?: string;
}

export const DetailsCard = ({
  title,
  children,
  minWidth = '20%'
}: DetailsCardProps) => (
  <Card
    elevation={0}
    sx={{
      minWidth,
      boxShadow: 'none',
      height: '100%',
      borderRadius: 2,
      border: theme => `1px solid ${theme.palette.customGrey.main}`,
    }}
  >
    <CardHeader
      title={
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
      }
      sx={{
        background: theme => theme.palette.customSurface.cardHeader,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        padding: '6px 12px',
        height: '40px',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
      }}
    />
    <CardContent
      sx={{
        bgcolor: 'customSurface.cardContent',
        py: 1.5,
        px: 2,
        '&:last-child': {
          paddingBottom: 2
        },
        borderRadius: '0 0 8px 8px'
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
