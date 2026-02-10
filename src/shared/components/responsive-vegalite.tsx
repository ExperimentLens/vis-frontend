import { Box, GlobalStyles, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  bar?: Record<string, unknown>;
  line?: Record<string, unknown>;
  point?: Record<string, unknown>;
  area?: Record<string, unknown>;
  range?: Record<string, unknown>;
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
    bar: {
      color: theme.palette.primary.main,
      ...(baseConfig?.bar ?? {}),
    },
    line: {
      color: theme.palette.primary.main,
      ...(baseConfig?.line ?? {}),
    },
    point: {
      color: theme.palette.primary.main,
      ...(baseConfig?.point ?? {}),
    },
    area: {
      color: theme.palette.primary.main,
      ...(baseConfig?.area ?? {}),
    },
    ...(baseConfig?.range && { range: baseConfig.range }),
  } as VegaConfig;

  // Heatmap color range from theme primary so it adapts to light/dark mode
  const heatmapColorRange = [
    alpha(theme.palette.primary.main, 0.12),
    theme.palette.primary.main,
  ] as [string, string];

  const singleSpec = spec as { mark?: unknown; encoding?: { color?: { type?: string; scale?: object } } };
  const isHeatmap =
    (singleSpec.mark === 'rect' ||
      (typeof singleSpec.mark === 'object' && (singleSpec.mark as { type?: string })?.type === 'rect')) &&
    singleSpec.encoding?.color &&
    (typeof singleSpec.encoding.color === 'object' && singleSpec.encoding.color !== null) &&
    singleSpec.encoding.color.type === 'quantitative';

  const themedSpec = {
    ...spec,
    autosize: { type: 'fit', contains: 'padding' }, // Ensure the chart adjusts to container size
    width: width,
    height: height,
    background: theme.palette.background.paper,
    config: themedConfig as VisualizationSpec['config'],
    ...(isHeatmap && singleSpec.encoding && {
      encoding: {
        ...singleSpec.encoding,
        color: {
          ...(typeof singleSpec.encoding.color === 'object' && singleSpec.encoding.color !== null
            ? singleSpec.encoding.color
            : {}),
          scale: {
            ...(typeof singleSpec.encoding.color === 'object' &&
            singleSpec.encoding.color !== null &&
            singleSpec.encoding.color.scale &&
            typeof singleSpec.encoding.color.scale === 'object'
              ? singleSpec.encoding.color.scale
              : {}),
            range: heatmapColorRange,
          },
        },
      },
    }),
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
