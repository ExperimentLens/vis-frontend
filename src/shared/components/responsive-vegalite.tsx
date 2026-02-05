import { Box, GlobalStyles, useTheme } from '@mui/material';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VegaLite } from 'react-vega';
import type { VisualizationSpec } from 'vega-embed';

interface ResponsiveVegaLiteProps {
  spec: VisualizationSpec; // VegaLite specification
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number; // Aspect ratio (width / height)
  [key: string]: unknown; // Capture all other props
}

type VegaConfig = NonNullable<VisualizationSpec['config']> & {
  view?: Record<string, unknown>;
  axis?: Record<string, unknown>;
  axisX?: Record<string, unknown>;
  axisY?: Record<string, unknown>;
  legend?: Record<string, unknown>;
  title?: Record<string, unknown>;
  text?: Record<string, unknown>;
};

const ResponsiveVegaLite: React.FC<ResponsiveVegaLiteProps> = ({
  spec,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 2000,
  maxHeight = 300,
  aspectRatio = 1, // Default aspect ratio (1:1 -> square)
  ...otherProps
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(minWidth);
  const [height, setHeight] = useState(minHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseConfig = spec.config as VegaConfig | undefined;
  const themedConfig = {
    ...baseConfig,
    view: {
      stroke: theme.palette.divider,
      ...(baseConfig?.view ?? {}),
    },
    axis: {
      labelColor: theme.palette.text.secondary,
      titleColor: theme.palette.text.primary,
      tickColor: theme.palette.divider,
      domainColor: theme.palette.divider,
      gridColor: theme.palette.divider,
      ...(baseConfig?.axis ?? {}),
    },
    axisX: {
      labelColor: theme.palette.text.secondary,
      titleColor: theme.palette.text.primary,
      tickColor: theme.palette.divider,
      domainColor: theme.palette.divider,
      gridColor: theme.palette.divider,
      ...(baseConfig?.axisX ?? {}),
    },
    axisY: {
      labelColor: theme.palette.text.secondary,
      titleColor: theme.palette.text.primary,
      tickColor: theme.palette.divider,
      domainColor: theme.palette.divider,
      gridColor: theme.palette.divider,
      ...(baseConfig?.axisY ?? {}),
    },
    legend: {
      labelColor: theme.palette.text.secondary,
      titleColor: theme.palette.text.primary,
      ...(baseConfig?.legend ?? {}),
    },
    title: {
      color: theme.palette.text.primary,
      font: theme.typography.fontFamily,
      ...(baseConfig?.title ?? {}),
    },
    text: {
      color: theme.palette.text.primary,
      ...(baseConfig?.text ?? {}),
    },
  } as VegaConfig;
  const themedSpec = {
    ...spec,
    autosize: { type: 'fit', contains: 'padding' }, // Ensure the chart adjusts to container size
    width: width,
    height: height,
    background: theme.palette.background.paper,
    config: themedConfig as VisualizationSpec['config'],
  } as VisualizationSpec;

  // Function to update the chart dimensions based on the container's size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const newWidth = Math.max(minWidth, Math.min(containerWidth, maxWidth)); // Use at least the minimum width and at most the maximum width
      const newHeight = Math.max(
        minHeight,
        Math.min(newWidth / aspectRatio, maxHeight),
      ); // Calculate height based on the aspect ratio while respecting the maximum height

      setWidth(newWidth);
      setHeight(newHeight);
    }
  }, [aspectRatio, containerRef, maxHeight, maxWidth, minHeight, minWidth]);

  useEffect(() => {
    // Call updateSize whenever the window is resized
    const handleResize = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResize);
    updateSize(); // Initial update on mount

    return () => {
      window.removeEventListener('resize', handleResize); // Cleanup event listener
    };
  }, [minWidth, minHeight, aspectRatio, updateSize]);

  return (
    <>
      <GlobalStyles
        styles={{
          '#vg-tooltip-element': {
            zIndex: theme.zIndex.modal + 2,
          },
        }}
      />
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <VegaLite spec={themedSpec} {...otherProps} />
      </Box>
    </>
  );
};

export default ResponsiveVegaLite;
