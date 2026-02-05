import { RouterProvider } from 'react-router-dom';
import './App.css';
import MainRoutes from './routes';
import { clearExpiredLocalStorage } from './shared/utils/localStorageCache';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from '@mui/material/styles';

const App = () => {
  const theme = useTheme();

  useEffect(() => {
    // Run once immediately
    clearExpiredLocalStorage(['compare-', 'experiment-', 'workflows-']);

    // Schedule cleanup every 10 min
    const interval = setInterval(
      () => {
        clearExpiredLocalStorage(['compare-', 'experiment-', 'workflows-']);
      },
      10 * 60 * 1000,
    );

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <>
      <RouterProvider router={MainRoutes} />

      {/* Global Toast Container - Available across entire app */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme.palette.mode}
      />
    </>
  );
};

export default App;
