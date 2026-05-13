import { describe, expect, test } from 'vitest';

import type { ProcedureHierarchyDepartment } from '../Types/application';
import { getDepartmentContextLabel } from './departmentContext';

const hierarchyDepartments: ProcedureHierarchyDepartment[] = [
  {
    id: 'card',
    name: 'Cardiology',
    visit_count: 50,
    procedures: [],
  },
  {
    id: 'onc',
    name: 'Oncology',
    visit_count: 120,
    procedures: [],
  },
  {
    id: 'rad',
    name: 'Radiology',
    visit_count: 80,
    procedures: [],
  },
];

describe('getDepartmentContextLabel', () => {
  test('returns null when no departments are filtered', () => {
    expect(getDepartmentContextLabel([], hierarchyDepartments)).toBeNull();
  });

  test('formats a single department label', () => {
    expect(getDepartmentContextLabel(['Oncology'], hierarchyDepartments)).toBe('From Oncology Providers');
  });

  test('formats two departments inline', () => {
    expect(getDepartmentContextLabel(['Oncology', 'Radiology'], hierarchyDepartments)).toBe('From Oncology, Radiology Providers');
  });

  test('uses the largest department when more than two are selected', () => {
    expect(getDepartmentContextLabel(['Cardiology', 'Radiology', 'Oncology'], hierarchyDepartments)).toBe('From Providers in Oncology + 2 more…');
  });

  test('supports a custom prefix', () => {
    expect(getDepartmentContextLabel(['Oncology'], hierarchyDepartments, 'From')).toBe('From Oncology Providers');
  });
});
