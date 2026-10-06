/** ROC curve as the evaluation endpoint returns it (`roc_data.json` or a CSV). */
export interface RocCurveData {
  fpr: number[];
  tpr: number[];
  thresholds?: number[];
  auc?: number;
  roc_auc?: number;
}

// sklearn's first threshold is +inf, which is not valid JSON and not plottable.
const INFINITY_STANDIN = 1e9;

const toNumber = (value: string | number): number => {
  if (value === Infinity || value === 'Infinity') return INFINITY_STANDIN;
  if (value === -Infinity || value === '-Infinity') return -INFINITY_STANDIN;

  return Number(value);
};

/** Parse a `fpr,tpr,threshold[,auc]` CSV; columns may come in any order. */
export function parseRocCsv(csv: string): RocCurveData {
  const [headerLine, ...dataLines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map(h => h.trim());

  const fprIdx = headers.indexOf('fpr');
  const tprIdx = headers.indexOf('tpr');
  const thrIdx = headers.indexOf('threshold');
  const aucIdx = headers.indexOf('auc');

  const fpr: number[] = [];
  const tpr: number[] = [];
  const thresholds: number[] = [];

  dataLines.forEach(line => {
    if (!line.trim()) return;
    const cols = line.split(',').map(c => c.trim());

    if (fprIdx >= 0) fpr.push(toNumber(cols[fprIdx]));
    if (tprIdx >= 0) tpr.push(toNumber(cols[tprIdx]));
    if (thrIdx >= 0) thresholds.push(toNumber(cols[thrIdx]));
  });

  let auc: number | undefined;

  if (aucIdx >= 0 && dataLines.length > 0) {
    const aucVal = Number(dataLines[0].split(',')[aucIdx]?.trim());

    if (!Number.isNaN(aucVal)) auc = aucVal;
  }

  return {
    fpr,
    tpr,
    thresholds: thresholds.length ? thresholds : undefined,
    ...(auc !== undefined ? { auc } : {}),
  };
}

/**
 * Normalize a ROC response, which arrives either as parsed JSON, a JSON string
 * (possibly containing bare `Infinity`), or a CSV string.
 */
export function parseRocPayload(payload: unknown): RocCurveData {
  let raw: unknown = payload;

  if (typeof payload === 'string') {
    const trimmed = payload.trim();

    raw = trimmed.startsWith('{') || trimmed.startsWith('[')
      // `-Infinity` becomes `-1e9` too, because the match starts after the sign.
      ? JSON.parse(trimmed.replace(/\bInfinity\b/g, String(INFINITY_STANDIN)))
      : parseRocCsv(trimmed);
  }

  const data = { ...(raw as RocCurveData) };
  const thresholds = (raw as { thresholds?: unknown })?.thresholds;

  if (Array.isArray(thresholds)) {
    data.thresholds = (thresholds as Array<string | number>).map(toNumber);
  }

  return data;
}
