import { DepartmentResponse } from '../Types/application';

/**
 * Converts a raw department name (e.g. "general-surgery", "cardiac_icu", or
 * "Critical Care") into normal Title Case (e.g. "General Surgery" / "Cardiac Icu").
 * Handles dash-separated slugs, underscore-separated slugs, and already
 * human-readable names with spaces without degrading mixed-case words.
 */
export function formatDepartmentName(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

/**
 * Formats the currently-filtered departments into a short human-readable string
 * for use in tooltips (e.g. "Within Oncology", "Within Oncology, Radiology",
 * "Within Oncology + 3 more…").
 *
 * Returns `null` when no department filter is active (all departments visible),
 * so callers can treat null as "show nothing".
 *
 * @param departments - The currently-filtered department IDs (from store.filterValues.departments)
 * @param hierarchy     - The full department hierarchy from store.departmentHierarchy
 * @param preposition   - Word before the department name(s). Defaults to "Within".
 *                        Use "From" for outcome-based rows (death, stroke, vent, ecmo).
 */
export function formatDepartmentFilter(
  departments: string[],
  hierarchy: DepartmentResponse | null,
  preposition: string = 'Within',
): string | null {
  if (!departments.length || !hierarchy) return null;

  // Look up matching departments and sort largest (by visit_count) first
  const matched = hierarchy.departments
    .filter((d) => departments.includes(d.id))
    .sort((a, b) => b.visit_count - a.visit_count);

  if (matched.length === 0) return null;

  const name0 = formatDepartmentName(matched[0].name);
  if (matched.length === 1) return `${preposition} ${name0}`;
  if (matched.length === 2) return `${preposition} ${name0}, ${formatDepartmentName(matched[1].name)}`;

  // 3 or more: show largest + count of remaining
  const extra = matched.length - 1;
  return `${preposition} ${name0} + ${extra} more\u2026`;
}
