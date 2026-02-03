import { IconButton } from '@mui/material';
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { setMode } from '../../store/slices/exploring/uiSlice';

export const ModeToggler = () => {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(state => state.ui.mode);

  const handleToggle = () => {
    dispatch(setMode(mode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <IconButton
      onClick={handleToggle}
      sx={{
        borderRadius: '50%',
        width: '36px',
        height: '36px',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
    </IconButton>
  );
};
