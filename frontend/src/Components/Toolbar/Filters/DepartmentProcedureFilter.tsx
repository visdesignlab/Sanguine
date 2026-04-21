import {
  Badge,
  Box,
  Checkbox,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useContext, useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';

type VisibleDepartment = {
  id: string;
  name: string;
  visit_count: number;
};

function DepartmentOption({
  department,
  checked,
  onToggleDepartment,
}: {
  department: VisibleDepartment;
  checked: boolean;
  onToggleDepartment: () => void;
}) {
  return (
    <Paper withBorder p="xs" radius="md">
      <Flex gap="xs" align="flex-start">
        <Checkbox
          checked={checked}
          onChange={onToggleDepartment}
          mt={2}
          aria-label={`Toggle ${department.name}`}
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={checked ? 700 : 600}>
            {department.name}
          </Text>
          <Badge
            size="xs"
            variant={checked ? 'light' : 'outline'}
            color={checked ? 'blue' : 'gray'}
            mt={2}
          >
            {department.visit_count.toLocaleString()}
            {' '}
            visits
          </Badge>
        </Box>
      </Flex>
    </Paper>
  );
}

export function DepartmentProcedureFilter() {
  const store = useContext(Store);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleDepartments, setVisibleDepartments] = useState<VisibleDepartment[]>([]);

  useEffect(() => {
    async function computeVisibleDepartments() {
      const result = await store.duckDB?.query('SELECT attending_provider_department, count(distinct visit_no) as visit_count FROM visits GROUP BY attending_provider_department');
      setVisibleDepartments((result?.toArray() || []).map((row) => ({
        id: row.attending_provider_department,
        name: row.attending_provider_department,
        visit_count: Number(row.visit_count),
      })));
    }

    computeVisibleDepartments();
  }, [store]);

  return useObserver(() => {
    const selectedDepartmentsSet = new Set(store.filterValues.departments);
    const selectedDepartmentsCount = selectedDepartmentsSet.size;

    const filteredDepartments = searchTerm.trim()
      ? visibleDepartments.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : visibleDepartments;

    const toggleDepartmentSelectionById = (departmentId: string) => {
      if (selectedDepartmentsSet.has(departmentId)) {
        selectedDepartmentsSet.delete(departmentId);
      } else {
        selectedDepartmentsSet.add(departmentId);
      }

      store.setProcedureFilters(
        Array.from(selectedDepartmentsSet).sort(),
        store.filterValues.procedureIds,
      );
    };

    return (
      <Stack gap={6}>
        <Flex w="100%" justify="flex-start" align="center">
          <Badge
            size="sm"
            color="blue"
            variant="light"
            px={8}
            styles={{ label: { textTransform: 'none' } }}
          >
            {selectedDepartmentsCount > 0
              ? `${selectedDepartmentsCount} ${selectedDepartmentsCount === 1 ? 'Department' : 'Departments'}`
              : 'All departments'}
          </Badge>
        </Flex>

        <TextInput
          placeholder="Search departments"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />

        <Stack gap="xs">
          {filteredDepartments.map((department) => (
            <DepartmentOption
              key={department.id}
              department={department}
              checked={selectedDepartmentsSet.has(department.id)}
              onToggleDepartment={() => toggleDepartmentSelectionById(department.id)}
            />
          ))}
          {filteredDepartments.length === 0 && (
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
