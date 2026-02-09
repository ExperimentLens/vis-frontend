import { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  FileUpload,
  type UploadParams,
} from '../../../../shared/components/file-upload';
import {
  type RootState,
  useAppDispatch,
  useAppSelector,
} from '../../../../store/store';
import { importZones } from '../../../../store/slices/exploring/zoneSlice';
import type { IZone } from '../../../../shared/models/exploring/zone.model';

export interface IZonesUploadProps {
  open: boolean;
  onClose: () => void;
}

export const ZonesUpload = ({ open, onClose }: IZonesUploadProps) => {
  const { id } = useAppSelector((state: RootState) => state.dataset.dataset);
  const dispatch = useAppDispatch();
  const handleUpload = useCallback(
    async (params: UploadParams): Promise<IZone[]> => {
      const result = await dispatch(
        importZones({ fileName: id || '', file: params.file }),
      ).unwrap();

      return result;
    },
    [dispatch],
  );

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Import Zones</DialogTitle>
      <DialogContent>
        <FileUpload
          onUpload={handleUpload}
          onUploadSuccess={onClose}
          acceptedFileTypes={['.json', '.geojson']}
          title="Import Zones"
          description="Drag and drop your zones file here, or click to browse"
          buttonText="Import Zones"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
