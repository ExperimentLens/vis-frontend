// Import necessary modules
import { grey, blue } from '@mui/material/colors';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Extend the existing palette interface to include custom properties
declare module '@mui/material/styles' {
  interface Palette {
    customGradient: {
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
      primary: { main: '#3766AF' },
      secondary: { main: '#6BBC8C' },
      customGradient: { main: 'linear-gradient(45deg, #6BBC8C 30%, #3766AF 90%)' },
      customGrey: {
        main: mode === 'dark' ? grey[900] : grey[100],
        dark: mode === 'dark' ? grey[800] : grey[400],
        light: mode === 'dark' ? grey[700] : grey[50],
        text: mode === 'dark' ? grey[100] : grey[700],
      },
      customBlue: { selected: mode === 'dark' ? blue[900] : blue[50] },
      background: {
        default: mode === 'dark' ? '#0E1021' : '#FFFFFF',
        paper: mode === 'dark' ? '#16192F' : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#0E1021',
        secondary: mode === 'dark' ? '#C9D1FF' : '#0E1021',
      },
    },
    typography: {
      fontFamily: '"All Round Gothic Bold", Arial, sans-serif',
      allVariants: { color: mode === 'dark' ? '#FFFFFF' : '#0E1021' },
    },
    components: {
      MuiTableCell: {
        styleOverrides: {
          stickyHeader: {
            backgroundColor: mode === 'dark' ? '#20243D' : '#f5f5f5',
            color: mode === 'dark' ? '#FFFFFF' : '#333',
            borderBottom: `2px solid ${mode === 'dark' ? '#2C3252' : '#ddd'}`,
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme, { factor: 2 });
};
