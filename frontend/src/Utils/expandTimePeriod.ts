const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthRe = /^\d{4}-[A-Za-z]{3}$/; // e.g., 2020-Jan
const quarterRe = /^(\d{4})-Q([1-4])$/; // e.g., 2024-Q3
const yearRe = /^(\d{4})$/; // e.g., 2024

/**
 * @param timePeriod A time period string, which can be in the format of 'YYYY', 'YYYY-Qn', or 'YYYY-MMM'
 * @returns An array of time periods with all sub-periods expanded.
 */
export function expandTimePeriod(timePeriod: string): string[] {
  if (!timePeriod) return [];

  const quarterMatch = timePeriod.match(quarterRe);
  const yearMatch = timePeriod.match(yearRe);

  if (yearMatch) {
    const year = yearMatch[1];
    return [
      `${year}`,
      ...[1, 2, 3, 4].map((q) => `${year}-Q${q}`),
      ...monthNames.map((m) => `${year}-${m}`),
    ];
  }

  if (quarterMatch) {
    const year = quarterMatch[1];
    const qNum = Number(quarterMatch[2]);
    const startIdx = (qNum - 1) * 3;
    return [
      `${year}-Q${qNum}`,
      `${year}-${monthNames[startIdx]}`,
      `${year}-${monthNames[startIdx + 1]}`,
      `${year}-${monthNames[startIdx + 2]}`,
    ];
  }

  if (monthRe.test(timePeriod)) return [timePeriod];

  return [];
}
