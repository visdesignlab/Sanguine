import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  Collapse,
  Divider,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useContext, useState } from 'react';
import {
  IconChevronDown,
  IconSearch,
} from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import {
  ProcedureHierarchyDepartment,
  ProcedureHierarchyProcedure,
} from '../../../Types/application';

function ProcedureOption({
  procedure,
  checked,
  onToggle,
}: {
  procedure: ProcedureHierarchyProcedure;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onChange={onToggle}
      size="xs"
      label={(
        <Flex justify="space-between" align="flex-start" gap="xs" w="100%" wrap="nowrap">
          <Text size="xs" style={{ flex: 1, minWidth: 0 }}>
            {procedure.name}
          </Text>
          <Badge
            size="xs"
            variant={checked ? 'filled' : 'light'}
            color={checked ? 'blue' : 'gray'}
            style={{ flexShrink: 0 }}
          >
            {procedure.visit_count.toLocaleString()}
          </Badge>
        </Flex>
      )}
    />
  );
}

function DepartmentOption({
  department,
  checked,
  indeterminate,
  expanded,
  selectedProcedureCount,
  onToggleExpanded,
  onToggleDepartment,
  procedures,
  totalProcedureCount,
  selectedProcedureIdsSet,
  onToggleProcedureById,
}: {
  department: ProcedureHierarchyDepartment;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  selectedProcedureCount: number;
  onToggleExpanded: () => void;
  onToggleDepartment: () => void;
  procedures: ProcedureHierarchyProcedure[];
  totalProcedureCount: number;
  selectedProcedureIdsSet: Set<string>;
  onToggleProcedureById: (procedureId: string) => void;
}) {
  const isActive = checked || selectedProcedureCount > 0;

  return (
    <Paper withBorder p="xs" radius="md">
      <Flex justify="space-between" align="flex-start" gap="xs">
        <Flex gap="xs" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={onToggleDepartment}
            mt={2}
            aria-label={`Toggle ${department.name}`}
          />
          <Box style={{ minWidth: 0 }}>
            <Text size="sm" fw={isActive ? 700 : 600}>
              {department.name}
            </Text>
            <Text size="xs" c="dimmed">
              {totalProcedureCount.toLocaleString()}
              {' '}
              procedures
            </Text>
          </Box>
        </Flex>
        <ActionIcon
          variant="subtle"
          color={isActive ? 'blue' : 'gray'}
          onClick={onToggleExpanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${department.name}`}
        >
          <IconChevronDown size={18} style={expanded ? { transform: 'rotate(180deg)' } : undefined} />
        </ActionIcon>
      </Flex>

      <Flex gap="xs" align="center" wrap="wrap" mt={4} ml={24}>
        {selectedProcedureCount > 0 && (
          <Badge size="xs" variant="filled" color="blue">
            {selectedProcedureCount}
            {' '}
            selected
          </Badge>
        )}
        <Badge
          size="xs"
          variant={isActive ? 'light' : 'outline'}
          color={isActive ? 'blue' : 'gray'}
        >
          {department.visit_count.toLocaleString()}
          {' '}
          visits
        </Badge>
      </Flex>

      <Collapse in={expanded}>
        <Divider my="sm" />
        <Stack gap={6} ml="xs">
          {procedures.map((procedure) => (
            <ProcedureOption
              key={procedure.id}
              procedure={procedure}
              checked={selectedProcedureIdsSet.has(procedure.id)}
              onToggle={() => onToggleProcedureById(procedure.id)}
            />
          ))}
          {procedures.length === 0 && (
            <Text size="xs" c="dimmed">
              No procedures match this search.
            </Text>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
}

type VisibleDepartment = {
  id: string;
  name: string;
  visit_count: number;
  procedures: ProcedureHierarchyProcedure[];
  totalProcedureCount: number;
};

function getVisibleDepartments(
  departments: ProcedureHierarchyDepartment[],
  searchTerm: string,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return departments.map((department) => ({
      ...department,
      procedures: department.procedures,
      totalProcedureCount: department.procedures.length,
    }));
  }

  return departments
    .map((department) => {
      const departmentMatches = department.name.toLowerCase().includes(normalizedSearch);
      const matchingProcedures = departmentMatches
        ? department.procedures
        : department.procedures
          .filter((procedure) => procedure.name.toLowerCase().includes(normalizedSearch));
      if (!departmentMatches && matchingProcedures.length === 0) return null;
      return {
        id: department.id,
        name: department.name,
        visit_count: department.visit_count,
        procedures: matchingProcedures,
        totalProcedureCount: department.procedures.length,
      };
    })
    .filter((department): department is VisibleDepartment => Boolean(department));
}

export function DepartmentProcedureFilter() {
  const store = useContext(Store);
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  return useObserver(() => {
    const hierarchy = store.procedureHierarchy;
    if (!hierarchy) {
      return (
        <Text size="sm" c="dimmed">
          Procedure hierarchy is unavailable. Try regenerating parquet caches.
        </Text>
      );
    }

    if (hierarchy.departments.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          No mapped department/procedure data is currently available.
        </Text>
      );
    }

    const selectedDepartmentIdsSet = new Set(store.filterValues.departmentIds);
    const selectedProcedureIdsSet = new Set(store.filterValues.procedureIds);
    const hierarchyDepartmentById = new Map(hierarchy.departments.map((department) => [department.id, department]));

    const visibleDepartments = getVisibleDepartments(hierarchy.departments, searchTerm);

    const involvedDepartmentIds = new Set(selectedDepartmentIdsSet);
    selectedProcedureIdsSet.forEach((procedureId) => {
      const departmentId = procedureId.split('__', 1)[0];
      if (hierarchyDepartmentById.has(departmentId)) {
        involvedDepartmentIds.add(departmentId);
      }
    });

    const selectedDepartmentsCount = involvedDepartmentIds.size;
    const selectedProceduresCount = selectedProcedureIdsSet.size;

    const toggleDepartmentSelectionById = (departmentId: string) => {
      const targetDepartment = hierarchy.departments.find((department) => department.id === departmentId);
      if (!targetDepartment) {
        return;
      }

      if (selectedDepartmentIdsSet.has(departmentId)) {
        selectedDepartmentIdsSet.delete(departmentId);
        targetDepartment.procedures.forEach((procedure) => selectedProcedureIdsSet.delete(procedure.id));
      } else {
        selectedDepartmentIdsSet.add(departmentId);
        targetDepartment.procedures.forEach((procedure) => selectedProcedureIdsSet.add(procedure.id));
      }

      store.setFilterValue('departmentIds', Array.from(selectedDepartmentIdsSet).sort());
      store.setFilterValue('procedureIds', Array.from(selectedProcedureIdsSet).sort());
    };

    const toggleProcedureSelectionById = (procedureId: string) => {
      if (selectedProcedureIdsSet.has(procedureId)) {
        selectedProcedureIdsSet.delete(procedureId);
      } else {
        selectedProcedureIdsSet.add(procedureId);
      }

      const departmentId = procedureId.split('__', 1)[0];
      const department = hierarchyDepartmentById.get(departmentId);
      if (department) {
        const selectedCount = department.procedures
          .filter((procedure) => selectedProcedureIdsSet.has(procedure.id)).length;
        const allSelected = selectedCount === department.procedures.length && department.procedures.length > 0;

        if (allSelected) {
          selectedDepartmentIdsSet.add(departmentId);
        } else {
          selectedDepartmentIdsSet.delete(departmentId);
        }
      }

      store.setFilterValue('departmentIds', Array.from(selectedDepartmentIdsSet).sort());
      store.setFilterValue('procedureIds', Array.from(selectedProcedureIdsSet).sort());
    };

    const toggleDepartmentExpanded = (departmentId: string) => {
      if (expandedDepartments.includes(departmentId)) {
        setExpandedDepartments(expandedDepartments.filter((id) => id !== departmentId));
      } else {
        setExpandedDepartments([...expandedDepartments, departmentId]);
      }
    };

    return (
      <Stack gap={6}>
        <Flex w="100%" justify="space-between" align="center" gap="xs">
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
          <Badge
            size="sm"
            color="blue"
            variant="light"
            px={8}
            styles={{ label: { textTransform: 'none' } }}
          >
            {selectedProceduresCount > 0
              ? `${selectedProceduresCount} ${selectedProceduresCount === 1 ? 'Procedure' : 'Procedures'}`
              : 'All procedures'}
          </Badge>
        </Flex>

        <TextInput
          placeholder="Search departments or procedures"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />

        <Stack gap="xs">
          {visibleDepartments.map((department) => {
            const fullDepartment = hierarchyDepartmentById.get(department.id) || department;
            const selectedProcedureCount = fullDepartment.procedures
              .filter((procedure) => selectedProcedureIdsSet.has(procedure.id)).length;
            const totalProcedureCount = fullDepartment.procedures.length;
            const isChecked = selectedDepartmentIdsSet.has(department.id);
            const isIndeterminate = selectedProcedureCount > 0 && selectedProcedureCount < totalProcedureCount;
            const isExpanded = expandedDepartments.includes(department.id);

            return (
              <DepartmentOption
                key={department.id}
                department={{
                  id: department.id,
                  name: department.name,
                  visit_count: department.visit_count,
                  procedures: department.procedures,
                }}
                checked={isChecked}
                indeterminate={isIndeterminate}
                expanded={isExpanded}
                selectedProcedureCount={selectedProcedureCount}
                onToggleExpanded={() => toggleDepartmentExpanded(department.id)}
                onToggleDepartment={() => toggleDepartmentSelectionById(department.id)}
                procedures={department.procedures}
                totalProcedureCount={totalProcedureCount}
                selectedProcedureIdsSet={selectedProcedureIdsSet}
                onToggleProcedureById={toggleProcedureSelectionById}
              />
            );
          })}
          {visibleDepartments.length === 0 && (
            <Paper withBorder p="xs" radius="md">
              <Text size="xs" c="dimmed">
                No departments or procedures match your search.
              </Text>
            </Paper>
          )}
        </Stack>
      </Stack>
    );
  });
}
