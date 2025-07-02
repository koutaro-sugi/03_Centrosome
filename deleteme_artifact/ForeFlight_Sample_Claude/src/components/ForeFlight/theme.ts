import { createTheme } from '@mui/material/styles';

export const foreFlightTheme = createTheme({
  palette: {
    primary: {
      main: '#1e374f',
      light: '#344a61',
      dark: '#0d1b26',
    },
    secondary: {
      main: '#3498db',
      light: '#5dade2',
      dark: '#2471a3',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
    },
    background: {
      default: '#1e374f',
      paper: '#344a61',
    },
    divider: 'rgba(255, 255, 255, 0.15)',
  },
  typography: {
    fontFamily: ['Helvetica Neue', 'Arial', 'sans-serif'].join(','),
    fontSize: 11,
    fontWeightBold: 700,
  },
  shape: {
    borderRadius: 2,
  },
});