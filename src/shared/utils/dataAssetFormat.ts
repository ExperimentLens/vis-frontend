// Central place that decides what "kind" a data asset is, so the comparison
// selector, controls and charts all agree. Mirrors the backend detection in
// vis-api (DataController.isImageFile / isTextFile): we look at the declared
// `format` first, then fall back to the extension on `source`/`name`.

export type DataAssetKind = 'tabular' | 'image' | 'text' | 'other';

const TABULAR_EXTENSIONS = ['csv', 'parquet'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'svg'];
const TEXT_EXTENSIONS = ['txt', 'log', 'md', 'markdown'];

type AssetLike = {
  format?: string | null;
  source?: string | null;
  name?: string | null;
} | null | undefined;

const kindForExtension = (ext: string | null): DataAssetKind => {
  if (!ext) return 'other';
  if (TABULAR_EXTENSIONS.includes(ext)) return 'tabular';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  return 'other';
};

// Pulls the extension out of a path/URL (drops any query string or hash first).
const extensionOf = (value?: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const clean = value.trim().toLowerCase().split(/[?#]/)[0];
  const lastDot = clean.lastIndexOf('.');

  if (lastDot === -1 || lastDot === clean.length - 1) return null;

  return clean.slice(lastDot + 1);
};

export const categorizeDataAsset = (asset: AssetLike): DataAssetKind => {
  if (!asset) return 'other';

  // `format` may be a bare extension ("csv") or dotted (".csv"); normalize it.
  const normalizedFormat =
    typeof asset.format === 'string'
      ? asset.format.trim().toLowerCase().replace(/^\./, '')
      : null;

  const fromFormat = kindForExtension(normalizedFormat);

  if (fromFormat !== 'other') return fromFormat;

  const fromSource = kindForExtension(extensionOf(asset.source));

  if (fromSource !== 'other') return fromSource;

  return kindForExtension(extensionOf(asset.name));
};

// A dataset is comparable if we know how to render it (tabular, image or text).
export const isComparableDataAsset = (asset: AssetLike): boolean =>
  categorizeDataAsset(asset) !== 'other';
