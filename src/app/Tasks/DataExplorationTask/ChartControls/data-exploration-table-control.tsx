import type React from 'react';
import { useState } from 'react';
import { Box, Button } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAppSelector, useAppDispatch } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import SelectionPopover from '../../../../shared/components/selection-popover';

// Self-contained "Visible Columns" control for the data-table card header.
//
// The trigger is a labelled button carrying the live selected-column count; it
// opens the shared SelectionPopover — the SAME popover the comparative-analysis
// "Visible Columns" selector uses — so the two genuinely share one component.
// It owns its own anchor state and is passed via the card's `headerActions`
// slot, NOT `controlPanel`: the latter drops its body inside the gear menu (and
// the fullscreen menu), which would nest this popover inside another menu.
const ColumnSelectionControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const originalColumns =
    tab?.workflowTasks.dataExploration?.metaData.data?.originalColumns || [];
  const selectedColumns =
    tab?.workflowTasks.dataExploration?.controlPanel?.selectedColumns || [];
  const selectedColumnNames = selectedColumns.map(col => col.name);

  const handleToggle = (columnName: string) => {
    const newSelectedColumns = selectedColumns.some(col => col.name === columnName)
      ? selectedColumns.filter(col => col.name !== columnName)
      : [...selectedColumns, originalColumns.find(col => col.name === columnName)!];

    dispatch(setControls({ selectedColumns: newSelectedColumns }));
  };

  const handleClear = () => dispatch(setControls({ selectedColumns: [] }));

  return (
    <>
      <Button
        aria-label="visible columns"
        size="small"
        variant="text"
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<ViewColumnIcon fontSize="small" />}
        endIcon={<ArrowDropDownIcon fontSize="small" />}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.78rem',
          color: 'text.secondary',
          borderRadius: 1.5,
          px: 1,
          '& .MuiButton-startIcon': { mr: 0.5 },
          '& .MuiButton-endIcon': { ml: 0.25 },
        }}
      >
        Columns
        {selectedColumnNames.length > 0 && (
          <Box
            component="span"
            sx={{
              ml: 0.75,
              px: 0.75,
              minWidth: 18,
              height: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              fontSize: '0.68rem',
              fontWeight: 700,
              lineHeight: 1,
              color: 'primary.main',
              bgcolor: theme => theme.palette.action.selected,
            }}
          >
            {selectedColumnNames.length}
          </Box>
        )}
      </Button>

      <SelectionPopover
        id="data-table-columns"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        title="Visible Columns"
        options={originalColumns.map(col => col.name)}
        selectedOptions={selectedColumnNames}
        onToggle={handleToggle}
        onClear={handleClear}
        clearLabel="Clear Columns"
        searchable
        searchPlaceholder="Search columns…"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      />
    </>
  );
};

export default ColumnSelectionControl;
