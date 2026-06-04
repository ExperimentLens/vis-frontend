import type { Theme } from '@mui/material/styles';

export type VegaOrdinalColorScale = {
  domain: string[];
  range: string[];
};

/**
 * Shared palette used by all charts for coloring.
 * You can tweak the order once and both charts will update.
 */
export const getColorPalette = (theme: Theme): string[] => [
  theme.palette.secondary.main,
  theme.palette.customPrimary.main,
  theme.palette.error.main,
  theme.palette.warning.main,
  theme.palette.info.main,
  theme.palette.success.main,
  theme.palette.text.secondary,
  theme.palette.grey[600],
  theme.palette.grey[800],
  theme.palette.grey[400],
];

/**
 * Builds a deterministic domain/range mapping (Vega-Lite scale) for metric names.
 * - domain: metric names
 * - range: colors aligned by index
 */
export const buildColorScale = (
  metricNames: string[],
  theme: Theme
): VegaOrdinalColorScale => {
  const domain = metricNames.filter(Boolean);
  const palette = getColorPalette(theme);

  const range = domain.map((_, i) => palette[i % palette.length]);

  return { domain, range };
};

/**
 * Convenience helper: returns a Vega-Lite scale object or undefined if no metrics.
 * Useful for inline usage in specs.
 */
export const vegaScaleOrUndefined = (
  metricNames: string[] | undefined | null,
  theme: Theme
) => {
  if (!metricNames?.length) return undefined;
  const { domain, range } = buildColorScale(metricNames, theme);

  return { domain, range };
};
