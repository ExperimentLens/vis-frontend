import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';

/** How many params/metrics a tree section shows before "Show more". */
export const PREVIEW_COUNT = 3;

/** Keeps long param/metric lists short: the first PREVIEW_COUNT items, the rest behind a toggle. */
export function useShowMore<T>(items: T[]) {
  const [expanded, setExpanded] = useState(false);

  return {
    visible: expanded ? items : items.slice(0, PREVIEW_COUNT),
    hidden: Math.max(0, items.length - PREVIEW_COUNT),
    expanded,
    toggle: () => setExpanded(e => !e),
  };
}

type Props = { itemId: string; hidden: number; expanded: boolean; onToggle: () => void };

export default function ShowMoreTreeItem({ itemId, hidden, expanded, onToggle }: Props) {
  if (hidden === 0) return null;

  return (
    <TreeItem
      itemId={itemId}
      slotProps={{ content: { style: { backgroundColor: 'transparent' } } }}
      label={
        <Box
          onClick={e => { e.stopPropagation(); onToggle(); }}
          sx={{ px: 1, py: 0.25, display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
        >
          {expanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {expanded ? 'Show less' : `Show ${hidden} more`}
          </Typography>
        </Box>
      }
    />
  );
}
