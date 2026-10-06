import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { isChunkLoadError } from './shared/utils/chunk-load-error';

const describe = (error: unknown): string => {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  if (error instanceof Error) return error.message;

  return 'Unknown error';
};

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Pages are code-split; a tab opened before a redeploy asks for chunks that no longer exist.
  const staleBuild = isChunkLoadError(error);

  return (
    <Box
      id="error-page"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480, textAlign: 'center' }}>
        <ErrorOutlineRoundedIcon color={staleBuild ? 'info' : 'error'} sx={{ fontSize: 56 }} />
        <Typography variant="h5" component="h1" fontWeight={700}>
          {staleBuild ? 'A new version of ExperimentLens is available' : 'Something went wrong'}
        </Typography>
        <Typography color="text.secondary">
          {staleBuild
            ? 'Reload the page to continue with the latest version.'
            : 'This page hit an unexpected error. Reloading usually fixes it; if not, go back to your experiments.'}
        </Typography>
        {!staleBuild && (
          <Typography
            component="code"
            variant="body2"
            sx={{ px: 1.5, py: 1, borderRadius: 1, bgcolor: 'action.hover', wordBreak: 'break-word' }}
          >
            {describe(error)}
          </Typography>
        )}
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="outlined" onClick={() => navigate('/')}>
            All experiments
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
