import { TimePeriod } from '../Types/application';

export function safeParseDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) {
    throw new Error('Date input is null or undefined');
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateInput}`);
  }
  return date;
}

/**
 * Compare two time periods for sorting
 */
export function compareTimePeriods(a: TimePeriod, b: TimePeriod): number {
  // Extract year from both periods
  const yearA = parseInt(a.split('-')[0], 10);
  const yearB = parseInt(b.split('-')[0], 10);

  if (yearA !== yearB) {
    return yearA - yearB;
  }

  // If same year, compare based on type
  if (a.includes('Q') && b.includes('Q')) {
    // Quarter comparison
    const quarterA = parseInt(a.split('Q')[1], 10);
    const quarterB = parseInt(b.split('Q')[1], 10);
    return quarterA - quarterB;
  }

  if (a.includes('-') && b.includes('-') && !a.includes('Q') && !b.includes('Q')) {
    // Month comparison
    const monthA = a.split('-')[1];
    const monthB = b.split('-')[1];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.indexOf(monthA) - months.indexOf(monthB);
  }

  // Year only - already compared above
  return 0;
}

export const formatTimestamp = (timestamp: number): string => new Date(timestamp).toLocaleString('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric',
});
