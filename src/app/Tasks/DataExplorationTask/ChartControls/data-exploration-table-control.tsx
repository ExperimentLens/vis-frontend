import type React from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/store';
import { setControls } from '../../../../store/slices/workflowPageSlice';
import SelectionList from '../../../../shared/components/selection-list';

// Column selection control. Renders the shared SelectionList inline — the same
// list used by the comparative-analysis "Visible Columns" selector — so both
// views share one component. It is NOT wrapped in its own popover: this is
// rendered inside the data-table card's settings menu, which is already a popover.
const ColumnSelectionPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { tab } = useAppSelector(state => state.workflowPage);

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

  // No `title` here: this renders inside the card's settings menu, which already
  // shows an "Options" header — a second header band would look subordinate.
  return (
    <SelectionList
      options={originalColumns.map(col => col.name)}
      selectedOptions={selectedColumnNames}
      onToggle={handleToggle}
      onClear={handleClear}
      clearLabel="Clear Columns"
    />
  );
};

export default ColumnSelectionPanel;
