// Import necessary modules
import { grey, blue } from '@mui/material/colors';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Extend the existing palette interface to include custom properties
declare module '@mui/material/styles' {
  interface Palette {
    customPrimary: {
      main: string
    }
    customGradient: {
      gradient: string
      killedGradient: string
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
    customSurface: {
      /** Background for card / panel headers */
      cardHeader: string
      /** Background for settings section headers */
      sectionHeader: string
      /** Background for card content areas */
      cardContent: string
      /** Background for subdued stat tiles and tray areas */
      tray: string
      /** Track background for progress / split bars */
      barTrack: string
      /** Footer / dialog-actions background */
      footer: string
      /** Neutral/info stat card gradient */
      statCard: string
      /** Success stat card gradient */
      statCardSuccess: string
      /** Failure stat card gradient */
      statCardFailure: string
      /** Solid color for success indicators */
      statSuccess: string
      /** Solid color for failure indicators */
      statFailure: string
    }
  }
  interface PaletteOptions {
    customPrimary?: {
      main: string
    }
    customGradient?: {
      gradient: string
      killedGradient: string
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
    customSurface?: {
      cardHeader: string
      sectionHeader: string
      cardContent: string
      tray: string
      barTrack: string
      footer: string
      statCard: string
      statCardSuccess: string
      statCardFailure: string
      statSuccess: string
      statFailure: string
    }
  }
}

export type ThemeMode = 'light' | 'dark';

export const createAppTheme = (mode: ThemeMode) => {
  const isDark = mode === 'dark';

  let theme = createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? 'rgb(201, 201, 201)' : '#3766AF',
      },
      secondary: {
        main: '#6BBC8C',
      },
      customPrimary:{
        main: '#3766AF',
      },
      customGradient: {
        gradient: 'linear-gradient(45deg, #6BBC8C 30%, #3766AF 90%)',
        killedGradient: 'linear-gradient(90deg, #d17b0f, #b32d00)',
      },
      customGrey: {
        main:  isDark ? grey[800] : grey[100],
        dark:  isDark ? grey[600] : grey[400],
        light: isDark ? grey[900] : grey[50],
        text:  isDark ? grey[300] : grey[700],
      },
      customBlue: {
        selected: isDark ? blue[600] : blue[50],
      },
      customSurface: {
        cardHeader: isDark
          ? 'linear-gradient(to right, #20202e, #242634)'
          : 'linear-gradient(to right, #f8f9fa, #edf2f7)',
        sectionHeader: isDark
          ? 'linear-gradient(to right, #1a1a2e, #1e2133)'
          : 'linear-gradient(to right, #f1f5f9, #f8fafc)',
        cardContent: isDark ? '#1E1E1E' : '#FFFFFF',
        tray:        isDark ? grey[900]  : '#f8fafc',
        barTrack:    isDark ? grey[700]  : '#e2e8f0',
        footer:         isDark ? grey[900]  : '#f8f9fa',
        statCard:        isDark ? 'linear-gradient(135deg, #1a1a2e, #1e2133)' : 'linear-gradient(135deg, #f3f4f6, #e0e7ff)',
        statCardSuccess: isDark ? 'linear-gradient(135deg, #0d2b0d, #1a4a1a)' : 'linear-gradient(135deg, #d7f5d1, #a2d57a)',
        statCardFailure: isDark ? 'linear-gradient(90deg, #d17b0f, #b32d00)' : 'linear-gradient(90deg, #fcd9c8, #f87171)',
        statSuccess: isDark ? '#1a4a1a' : '#e6f4ea', 
        statFailure: isDark ? '#b32d00' : '#fdecea',
      },
      background: {
        default: isDark ? '#121212' : '#FFFFFF',
        paper:   isDark ? '#1E1E1E' : '#FFFFFF',
      },
      text: {
        primary:   isDark ? '#E0E0E0' : '#0E1021',
        secondary: isDark ? '#B0BEC5' : '#0E1021',
      },
    },
    typography: {
      fontFamily: '"All Round Gothic Bold", Arial, sans-serif',
      allVariants: {
        color: isDark ? '#FFFFFF' : '#0E1021',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            // Firefox
            scrollbarWidth: 'thin',
          },
        
          body: {
            // Firefox
            scrollbarColor: isDark
              ? `${grey[700]} ${grey[900]}`
              : `${grey[500]} ${grey[100]}`,
          },
        
          // Chrome / Edge / Safari
          '*::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: isDark ? grey[900] : grey[100],
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? grey[700] : grey[400],
            borderRadius: 10,
            border: `2px solid ${isDark ? grey[900] : grey[100]}`,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: isDark ? grey[600] : grey[500],
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme, { factor: 2 });
  return theme;
};

// Default light theme for files that import it statically
export default createAppTheme('light');
