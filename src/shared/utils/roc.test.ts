import { describe, expect, it } from 'vitest';
import { parseRocCsv, parseRocPayload } from './roc';

describe('parseRocPayload', () => {
  it('passes parsed JSON through and makes thresholds numeric', () => {
    expect(parseRocPayload({ fpr: [0, 1], tpr: [0, 1], thresholds: ['Infinity', '0.5'], roc_auc: 0.9 })).toEqual({
      fpr: [0, 1],
      tpr: [0, 1],
      thresholds: [1e9, 0.5],
      roc_auc: 0.9,
    });
  });

  it('accepts JSON text with bare Infinity, which JSON.parse alone rejects', () => {
    expect(parseRocPayload('{"fpr":[0,1],"tpr":[0,1],"thresholds":[Infinity,-Infinity]}').thresholds).toEqual([
      1e9,
      -1e9,
    ]);
  });

  it('falls back to CSV', () => {
    expect(parseRocPayload('fpr,tpr,threshold,auc\n0,0,Infinity,0.75\n1,1,0.1,0.75\n')).toEqual({
      fpr: [0, 1],
      tpr: [0, 1],
      thresholds: [1e9, 0.1],
      auc: 0.75,
    });
  });
});

describe('parseRocCsv', () => {
  it('reads columns in any order and omits missing ones', () => {
    expect(parseRocCsv('tpr,fpr\n0.5,0.25')).toEqual({ fpr: [0.25], tpr: [0.5], thresholds: undefined });
  });
});
