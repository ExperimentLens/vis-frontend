// Import necessary modules
import { grey, blue } from '@mui/material/colors';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Extend the existing palette interface to include custom properties
declare module '@mui/material/styles' {
  interface Palette {
    customGradient: {
      main: string
    }
    customGradientDialog: {
      main: string
    }
    customGrey: {
      main: string
      dark: string
      light: string
      text: string
    }
    customBlue: {
      selected: string
    }
  }
  interface PaletteOptions {
    customGradient?: {
      main: string
    }
    customGradientDialog?: {
      main: string
    }
    customGrey?: {
      main: string
      dark: string
      light: string
      text: string
    }
    customBlue?: {
      selected: string
    }
  }
}

export const createAppTheme = (mode: 'light' | 'dark') => {
  // Create the theme
  let theme = createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#f8bd44' : '#3766AF' },
      secondary: { main: mode === 'dark' ? '#44DFCB' : '#6BBC8C' },
      customGradient: { main: mode === 'dark' ? 'linear-gradient(45deg, #44DFCB 30%, #f8bd44 90%)' : 'linear-gradient(45deg, #6BBC8C 30%, #3766AF 90%)' },
      customGradientDialog: { main: mode === 'dark' ? 'linear-gradient(to right, #121212, #161616)' : 'linear-gradient(to right, #f8f9fa, #edf2f7)' },
      customGrey: {
        main: mode === 'dark' ? grey[900] : grey[100],
        dark: mode === 'dark' ? grey[800] : grey[400],
        light: mode === 'dark' ? grey[700] : grey[50],
        text: mode === 'dark' ? grey[100] : grey[700],
      },
      customBlue: { selected: mode === 'dark' ? blue[900] : blue[50] },
      background: {
        default: mode === 'dark' ? '#0E1021' : '#FFFFFF',
        paper: mode === 'dark' ? '#121212' : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#E0E0E0' : '#0E1021',
        secondary: mode === 'dark' ? '#C9D1FF' : '#0E1021',
      },
    },
    typography: {
      fontFamily: '"All Round Gothic Bold", Arial, sans-serif',
      allVariants: { color: mode === 'dark' ? '#FFFFFF' : '#0E1021' },
    },
    components: {
      MuiDialogContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            paddingTop: theme.spacing(3),
            '.MuiDialogTitle-root + &': {
              paddingTop: theme.spacing(3),
            },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          stickyHeader: {
            backgroundColor: mode === 'dark' ? '#252525' : '#f5f5f5',
            color: mode === 'dark' ? '#FFFFFF' : '#333',
            borderBottom: `2px solid ${mode === 'dark' ? '#2C3252' : '#ddd'}`,
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme, { factor: 2 });
};
