import type React from 'react';
import { Box, Typography, List, ListItemButton, Checkbox, ListItemText, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import { useAppSelector, useAppDispatch } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';

// Column selection panel component
const ColumnSelectionPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);

  const originalColumns = tab?.workflowTasks.dataExploration?.metaData.data?.originalColumns || [];
  const selectedColumns = tab?.workflowTasks.dataExploration?.controlPanel?.selectedColumns || [];
  const selectedColumnNames = selectedColumns.map(col => col.name);

  const handleColumnToggle = (columnName: string) => () => {
    const newSelectedColumns = selectedColumns.some(col => col.name === columnName)
      ? selectedColumns.filter(col => col.name !== columnName)
      : [...selectedColumns, originalColumns.find(col => col.name === columnName)!];

    dispatch(setControls({ selectedColumns: newSelectedColumns }));

    // if (newSelectedColumns.length) {
    //   handleFetchDataExploration(newSelectedColumns);
    // }
  };

  // const handleFetchDataExploration = (columns = selectedColumns) => {
  //   if (!columns?.length) return;

  //   dispatch(fetchDataExplorationData({
  //     query: {
  //       ...defaultDataExplorationQuery,
  //       datasetId: tab?.dataTaskTable.selectedItem?.data?.source || "",
  //       columns: columns.map(col => col.name),
  //       filters: tab?.workflowTasks.dataExploration?.controlPanel?.filters || [],
  //     },
  //     metadata: {
  //       workflowId: tab?.workflowId || "",
  //       queryCase: "chart",
  //     },
  //   }));
  // };

  const allSelected =
    originalColumns.length > 0 && selectedColumns.length === originalColumns.length;

  const toggleAll = () =>
    dispatch(setControls({ selectedColumns: allSelected ? [] : [...originalColumns] }));

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <ViewColumnRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', flex: 1 }}>
          Columns
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {selectedColumns.length}/{originalColumns.length}
        </Typography>
        <Button
          size="small"
          onClick={toggleAll}
          disabled={originalColumns.length === 0}
          sx={{ minWidth: 0, px: 0.75, fontSize: '0.7rem' }}
        >
          {allSelected ? 'Clear' : 'All'}
        </Button>
      </Box>
      <Box
        sx={{
          maxHeight: 250,
          overflow: 'auto',
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.customSurface.cardBorder}`,
          bgcolor: 'background.paper',
          p: 0.5,
        }}
      >
        <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {originalColumns.map((column) => {
            const checked = selectedColumnNames.includes(column.name);

            return (
              <ListItemButton
                key={column.name}
                onClick={handleColumnToggle(column.name)}
                dense
                sx={{
                  borderRadius: 1.5,
                  py: 0.25,
                  px: 0.75,
                  bgcolor: theme =>
                    checked ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  '&:hover': {
                    bgcolor: theme =>
                      checked
                        ? alpha(theme.palette.primary.main, 0.16)
                        : theme.palette.action.hover,
                  },
                }}
              >
                <Checkbox
                  edge="start"
                  checked={checked}
                  tabIndex={-1}
                  disableRipple
                  size="small"
                  color="primary"
                  sx={{ p: 0.5, mr: 0.5 }}
                />
                <ListItemText
                  primary={column.name}
                  slotProps={{
                    primary: {
                      variant: 'body2',
                      sx: {
                        fontSize: '0.82rem',
                        fontWeight: checked ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default ColumnSelectionPanel;
