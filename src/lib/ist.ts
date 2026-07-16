/**
 * Parse a timezone-less datetime string from an HTML datetime-local input
 * (e.g. "2026-08-01T08:00") as Indian Standard Time.
 *
 * Bus times are entered and displayed as Indian wall-clock times. A bare
 * string passed to new Date() is interpreted in the SERVER's timezone —
 * IST on a dev machine but UTC on Amplify — which shifted every schedule
 * by +5:30 in production. Pinning the offset makes parsing deterministic.
 */
export function parseISTDateTime(value: string): Date {
  // Already has an explicit offset or Z — trust it.
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);
  // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" → pin to IST.
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${withSeconds}+05:30`);
}
