import {
  Badge,
  Checkbox,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useContext, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import type { DepartmentHierarchyDepartment } from '../../../Types/application';

function DepartmentOption({
  department,
  checked,
  onToggle,
}: {
  department: DepartmentHierarchyDepartment;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Paper withBorder p="xs" radius="md">
      <Checkbox
        checked={checked}
        onChange={onToggle}
        label={(
          <Flex justify="space-between" align="flex-start" gap="xs" w="100%" wrap="nowrap">
            <Text size="sm" fw={checked ? 700 : 600} style={{ flex: 1, minWidth: 0 }}>
              {department.name}
            </Text>
            <Badge
              size="xs"
              variant={checked ? 'filled' : 'light'}
              color={checked ? 'blue' : 'gray'}
              style={{ flexShrink: 0 }}
            >
              {department.visit_count.toLocaleString()}
              {' '}
              visits
            </Badge>
          </Flex>
        )}
      />
    </Paper>
  );
}

export function DepartmentProcedureFilter() {
  const store = useContext(Store);
  const [searchTerm, setSearchTerm] = useState('');

  return useObserver(() => {
    const hierarchy = store.departmentHierarchy;
    if (!hierarchy) {
      return (
        <Text size="sm" c="dimmed">
          Department hierarchy is unavailable. Try regenerating parquet caches.
        </Text>
      );
    }

    if (hierarchy.departments.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          No department data is currently available.
        </Text>
      );
    }

    const selectedDepartmentIdsSet = new Set(store.filterValues.departmentIds);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleDepartments = normalizedSearch
      ? hierarchy.departments.filter((d) => d.name.toLowerCase().includes(normalizedSearch))
      : hierarchy.departments;

    const toggleDepartmentById = (departmentId: string) => {
      if (selectedDepartmentIdsSet.has(departmentId)) {
        selectedDepartmentIdsSet.delete(departmentId);
      } else {
        selectedDepartmentIdsSet.add(departmentId);
      }
      store.setDepartmentFilters(Array.from(selectedDepartmentIdsSet).sort());
    };

    const selectedCount = selectedDepartmentIdsSet.size;

    return (
      <Stack gap={6}>
        <Badge
          size="sm"
          color="blue"
          variant="light"
          px={8}
          styles={{ label: { textTransform: 'none' } }}
        >
          {selectedCount > 0
            ? `${selectedCount} ${selectedCount === 1 ? 'Department' : 'Departments'}`
            : 'All departments'}
        </Badge>

        <TextInput
          placeholder="Search departments"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />

        <Stack gap="xs">
          {visibleDepartments.map((department) => (
            <DepartmentOption
              key={department.id}
              department={department}
              checked={selectedDepartmentIdsSet.has(department.id)}
              onToggle={() => toggleDepartmentById(department.id)}
            />
          ))}
          {visibleDepartments.length === 0 && (
            <Paper withBorder p="xs" radius="md">
              <Text size="xs" c="dimmed">
                No departments match your search.
              </Text>
            </Paper>
          )}
        </Stack>
      </Stack>
    );
  });
}
