import { Box, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';
import FolderIcon from '@mui/icons-material/Folder';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import theme from '../../../../mui-theme';
import { useMemo } from 'react';
import { useAppDispatch } from '../../../../store/store';
import { setSelectedId, setSelectedItem } from '../../../../store/slices/workflowPageSlice';
import type { IDataAsset } from '../../../../shared/models/experiment/data-asset.model';
type Props = {
  taskId: string;
  datasets: IDataAsset[];
  experimentId?: string;
  workflowId?: string | number | null;
};

export default function DatasetsSection({ taskId, datasets, experimentId, workflowId }: Props) {
  const dispatch = useAppDispatch();

  const isSupportedDatasetFormat = (format?: string | null, name?: string | null) => {
    const normalizedFormat = (format ?? '').trim().toLowerCase()
      .replace(/^\./, '');

    if (normalizedFormat === 'csv' || normalizedFormat === 'parquet') return true;

    const normalizedName = (name ?? '').trim().toLowerCase();

    return normalizedName.endsWith('.csv') || normalizedName.endsWith('.parquet');
  };

  const isDatasetClickable = (ds: IDataAsset) => Boolean(ds.source) && isSupportedDatasetFormat(ds.format, ds.name);

  const getDatasetIcon = (format?: string | null, disabled?: boolean) => {
    const color = disabled ? theme.palette.action.disabled : theme.palette.primary.main;

    if (!format || !format.trim()) return <InsertDriveFileRoundedIcon style={{ color }} fontSize="small" />;
    switch (format.toLowerCase()) {
      case 'csv':
      case 'xls':
      case 'xlsx':
        return <TableChartRoundedIcon style={{ color }} fontSize="small" />;
      case 'json':
      case 'yaml':
        return <DataObjectRoundedIcon style={{ color }} fontSize="small" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'image':
        return <ImageRoundedIcon style={{ color }} fontSize="small" />;
      default:
        return <InsertDriveFileRoundedIcon style={{ color }} fontSize="small" />;
    }
  };

  const { inputGrouped, outputGrouped } = useMemo(() => {
    const input = datasets.filter(d => d.role === 'INPUT');
    const output = datasets.filter(d => d.role === 'OUTPUT');

    const group = (list: IDataAsset[]) =>
      list.reduce(
        (acc, ds) => {
          if (ds.folder) {
            if (!acc.folders[ds.folder]) acc.folders[ds.folder] = [];
            acc.folders[ds.folder].push(ds);
          } else {
            acc.noFolder.push(ds);
          }

          return acc;
        },
        { folders: {} as Record<string, IDataAsset[]>, noFolder: [] as IDataAsset[] }
      );

    return { inputGrouped: group(input), outputGrouped: group(output) };
  }, [datasets]);

  const renderFolderGroup = (kind: 'input' | 'output', folder: string, dsList: IDataAsset[], folderIndex: number) => (
    <TreeItem
      key={`${kind}-folder-${taskId}-${folderIndex}`}
      itemId={`${kind}-folder-${taskId}-${folderIndex}`}
      slotProps={{ content: { style: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, onClick: (e) => e.stopPropagation() } }}
      label={
        <Box sx={{ px: 1, py: 0.5, borderRadius: 1, display: 'flex', alignItems: 'center', cursor: 'default' }}>
          <FolderIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="body2">{folder}</Typography>
        </Box>
      }
    >
      {dsList.map((ds, index) => (
        (() => {
          const clickable = isDatasetClickable(ds);
          const itemId = `${kind}-ds-${taskId}-${folder}-${index}`;

          return (
            <TreeItem
              key={`${kind}-${taskId}-${folder}-${index}`}
              itemId={itemId}
              disabled={!clickable}
              label={
                <Box
                  onClick={() => {
                    if (!clickable) return;

                    dispatch(setSelectedId(itemId));
                    dispatch(setSelectedItem({ type: 'DATASET', data: { dataset: ds }, meta: { experimentId, workflowId } }));
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  {getDatasetIcon(ds.format, !clickable)}
                  <Typography variant="body2" sx={{ ml: 1, color: clickable ? 'text.primary' : 'text.disabled' }}>{ds.name}</Typography>
                </Box>
              }
            />
          );
        })()
      ))}
    </TreeItem>
  );

  const renderFlatList = (kind: 'input' | 'output', list: IDataAsset[]) =>
    list.map((ds, index) => (
      (() => {
        const clickable = isDatasetClickable(ds);
        const itemId = `${kind}-ds-${taskId}-nofolder-${index}`;

        return (
          <TreeItem
            key={`${kind}-${taskId}-nofolder-${index}`}
            itemId={itemId}
            disabled={!clickable}
            label={
              <Box
                onClick={() => {
                  if (!clickable) return;

                  dispatch(setSelectedId(itemId));
                  dispatch(setSelectedItem({ type: 'DATASET', data: { dataset: ds }, meta: { experimentId, workflowId } }));
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                {getDatasetIcon(ds.format, !clickable)}
                <Typography variant="body2" sx={{ ml: 1, color: clickable ? 'text.primary' : 'text.disabled' }}>{ds.name}</Typography>
              </Box>
            }
          />
        );
      })()
    ));

  return (
    <>
      {/* Inputs */}
      {datasets.some(d => d.role === 'INPUT') && (
        <TreeItem
          itemId={`task-${taskId}-inputs`}
          slotProps={{ content: { style: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, onClick: (e) => e.stopPropagation() } }}
          label={
            <Box sx={{ px: 1, py: 0.5, borderRadius: 1, cursor: 'default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <InputIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography>Inputs ({(datasets.filter(d => d.role === 'INPUT')).length})</Typography>
              </Box>
            </Box>
          }
        >
          {renderFlatList('input', inputGrouped.noFolder)}
          {Object.entries(inputGrouped.folders).map(([folder, dsList], i) => renderFolderGroup('input', folder, dsList, i))}
        </TreeItem>
      )}

      {/* Outputs */}
      {datasets.some(d => d.role === 'OUTPUT') && (
        <TreeItem
          itemId={`task-${taskId}-outputs`}
          slotProps={{ content: { style: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, onClick: (e) => e.stopPropagation() } }}
          label={
            <Box sx={{ px: 1, py: 0.5, borderRadius: 1, cursor: 'default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <OutputIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography>Outputs ({(datasets.filter(d => d.role === 'OUTPUT')).length})</Typography>
              </Box>
            </Box>
          }
        >
          {renderFlatList('output', outputGrouped.noFolder)}
          {Object.entries(outputGrouped.folders).map(([folder, dsList], i) => renderFolderGroup('output', folder, dsList, i))}
        </TreeItem>
      )}
    </>
  );
}
