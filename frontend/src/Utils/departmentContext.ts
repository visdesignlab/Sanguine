import { ProcedureHierarchyDepartment } from '../Types/application';

/**
 * Builds a contextual department label for tooltips based on the currently
 * filtered departments.
 *
 * Rules:
 *  - 0 filtered departments (all visible): returns null (no label)
 *  - 1 department: "Within Oncology" (or "From Oncology")
 *  - 2 departments: "From Oncology, Radiology"
 *  - 3+ departments: "From Oncology + 2 more…" where Oncology is the
 *    largest by visit_count from the hierarchy
 *
 * @param departments  Currently filtered department names
 * @param allDepartments  Full hierarchy departments (for visit_count lookup)
 * @param prefix  "From" — used for outcomes
 */
export function getDepartmentContextLabel(
  departments: string[],
  allDepartments: ProcedureHierarchyDepartment[] | undefined,
  prefix: 'From' = 'From',
): string | null {
  if (!departments || departments.length === 0) return null;

  if (departments.length === 1) {
    return `${prefix} ${departments[0]} Providers`;
  }

  if (departments.length === 2) {
    return `${prefix} ${departments[0]}, ${departments[1]} Providers`;
  }

  // 3+ departments — find the largest by visit_count
  const visitCountMap = new Map<string, number>();
  if (allDepartments) {
    allDepartments.forEach((d) => {
      visitCountMap.set(d.name, d.visit_count);
    });
  }

  // Sort descending by visit_count; fall back to 0 if not found
  const sorted = [...departments].sort(
    (a, b) => (visitCountMap.get(b) ?? 0) - (visitCountMap.get(a) ?? 0),
  );

  const largest = sorted[0];
  const remaining = departments.length - 1;

  return `${prefix} Providers in ${largest} + ${remaining} more\u2026`;
}
