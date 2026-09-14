export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export const dayKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

/**
 * Shared time-bucketing rule for every "over time" chart: hour-granularity when every
 * timestamp falls on the same calendar day, day-granularity otherwise.
 */
export const pickBucketMs = (times: number[]): number => {
  if (times.length === 0) return HOUR_MS;

  const days = new Set(times.map(time => dayKey(new Date(time))));

  return days.size <= 1 ? HOUR_MS : DAY_MS;
};

export const bucketStartMs = (timeMs: number, bucketMs: number): number =>
  Math.floor(timeMs / bucketMs) * bucketMs;

const formatHourLabel = (
  date: Date,
  includeDate: boolean,
): string =>
  includeDate
    ? date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });

const formatDayLabel = (date: Date): string => `${date.getMonth() + 1}/${date.getDate()}`;

/** Short axis-tick label: "8/31" for a day bucket, "02:00 PM" (or with date) for an hour bucket. */
export const formatBucketAxisLabel = (
  date: Date,
  bucketMs: number,
  includeDate: boolean,
): string =>
  bucketMs >= DAY_MS ? formatDayLabel(date) : formatHourLabel(date, includeDate);

const formatFullDay = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** Full tooltip title: "Aug 31, 2026" for a day bucket, "Aug 31, 2026, 02:00 PM" for an hour bucket. */
export const formatBucketTooltipTitle = (
  date: Date | null,
  isDailyBucket: boolean,
): string => {
  if (!date) return isDailyBucket ? 'Unknown day' : 'Unknown hour';

  return isDailyBucket
    ? formatFullDay(date)
    : date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};
