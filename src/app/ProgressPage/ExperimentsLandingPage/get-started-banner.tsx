import { Box, Button, Paper, Typography } from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';

/** Overridable per deployment; the defaults point at the published SDK and its maintainer. */
const SDK_DOCS_URL = import.meta.env.VITE_SDK_DOCS_URL || 'https://pypi.org/project/experimentlens/';
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || 'https://github.com/ExperimentLens';
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'panosgidarakos@gmail.com';

// The snippet stays dark in both themes, like a terminal.
const CODE = {
  bg: '#1E2329',
  text: '#E6EDF3',
  muted: '#8B949E',
  keyword: '#FF9E64',
  string: '#A5D6FF',
};

const pillSx = { textTransform: 'none', borderRadius: 14, fontWeight: 600 } as const;

const GetStartedBanner = () => (
  <Paper
    elevation={2}
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 3,
      px: 3,
      py: 2.5,
    }}
  >
    <Box sx={{ flex: '1 1 380px', minWidth: 0, display: 'flex', gap: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme => theme.palette.customBlue.selected,
          color: 'primary.main',
        }}
      >
        <ScienceOutlinedIcon />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Create a new experiment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            Log your ML or LLM experiments from Python. Runs, metrics, traces and
            explainability data show up in this table automatically.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            variant="contained"
            href={SDK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<MenuBookRoundedIcon />}
            sx={pillSx}
          >
            Read the SDK quickstart
          </Button>
          <Button
            variant="outlined"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<GitHubIcon />}
            sx={pillSx}
          >
            GitHub
          </Button>
          <Button
            variant="outlined"
            href={`mailto:${CONTACT_EMAIL}?subject=ExperimentLens`}
            startIcon={<MailOutlineRoundedIcon />}
            sx={pillSx}
          >
            Need help? Contact us
          </Button>
        </Box>
      </Box>
    </Box>

    <Box
      component="pre"
      sx={{
        flex: '1 1 380px',
        minWidth: 0,
        m: 0,
        px: 2,
        py: 1.5,
        borderRadius: 2.5,
        bgcolor: CODE.bg,
        color: CODE.text,
        fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '0.8rem',
        lineHeight: 1.7,
        overflowX: 'auto',
      }}
    >
      <span style={{ color: CODE.muted }}>$</span> pip install experimentlens{'\n'}
      <span style={{ color: CODE.keyword }}>from</span> experimentlens{' '}
      <span style={{ color: CODE.keyword }}>import</span> ExperimentTracker{'\n'}
      <span style={{ color: CODE.keyword }}>with</span> ExperimentTracker(
      <span style={{ color: CODE.string }}>&quot;my-first-experiment&quot;</span>){' '}
      <span style={{ color: CODE.keyword }}>as</span> tracker: ...
    </Box>
  </Paper>
);

export default GetStartedBanner;
