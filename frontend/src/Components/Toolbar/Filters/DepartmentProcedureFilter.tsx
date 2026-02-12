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
import classes from './DepartmentProcedureFilter.module.css';

function cx(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ');
}

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
    <Box className={cx(classes.procedureRow, checked && classes.procedureRowActive)}>
      <Checkbox
        checked={checked}
        onChange={onToggle}
        label={(
          <Flex justify="space-between" align="center" gap="sm" w="100%">
            <Text size="xs" className={classes.procedureName}>{procedure.name}</Text>
            <Badge
              size="xs"
              variant={checked ? 'filled' : 'light'}
              color={checked ? 'blue' : 'gray'}
              className={classes.countBadge}
            >
              {procedure.visit_count.toLocaleString()}
            </Badge>
          </Flex>
        )}
      />
    </Box>
  );
}

function DepartmentOption({
  department,
  checked,
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
    <Paper
      withBorder
      p="xs"
      className={cx(classes.departmentCard, isActive && classes.departmentCardActive)}
    >
      <Flex justify="space-between" align="flex-start" gap="xs">
        <Flex gap="xs" align="flex-start" className={classes.departmentTitleBlock}>
          <Checkbox
            checked={checked}
            onChange={onToggleDepartment}
            mt={2}
            aria-label={`Toggle ${department.name}`}
          />
          <Box>
            <Text size="sm" fw={isActive ? 700 : 600} className={classes.departmentName}>
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
          <IconChevronDown className={cx(classes.chevronIcon, expanded && classes.chevronIconOpen)} size={18} />
        </ActionIcon>
      </Flex>

      <Flex gap="xs" align="center" wrap="wrap" mt={4} ml={24}>
        {selectedProcedureCount > 0 && (
          <Badge size="xs" variant="filled" color="blue" className={classes.countBadge}>
            {selectedProcedureCount}
            {' '}
            selected
          </Badge>
        )}
        <Badge
          size="xs"
          variant={isActive ? 'light' : 'outline'}
          color={isActive ? 'blue' : 'gray'}
          className={classes.countBadge}
        >
          {department.visit_count.toLocaleString()}
          {' '}
          visits
        </Badge>
      </Flex>

      <Collapse in={expanded}>
        <Divider my="sm" />
        <Stack gap={6} ml="xs" className={classes.procedureList}>
          {procedures.map((procedure) => (
            <ProcedureOption
              key={procedure.id}
              procedure={procedure}
              checked={selectedProcedureIdsSet.has(procedure.id)}
              onToggle={() => onToggleProcedureById(procedure.id)}
            />
          ))}
          {procedures.length === 0 && (
            <Text size="xs" c="dimmed" className={classes.emptyText}>
              No procedures match this search.
            </Text>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
}

function toLower(value: string) {
  return value.toLowerCase();
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
  const normalizedSearch = toLower(searchTerm.trim());
  if (!normalizedSearch) {
    return departments.map((department) => ({
      ...department,
      procedures: department.procedures,
      totalProcedureCount: department.procedures.length,
    }));
  }

  return departments
    .map((department) => {
      const departmentMatches = toLower(department.name).includes(normalizedSearch);
      const matchingProcedures = departmentMatches
        ? department.procedures
        : department.procedures.filter((procedure) => toLower(procedure.name).includes(normalizedSearch));
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

    const visibleDepartments = getVisibleDepartments(hierarchy.departments, searchTerm);

    const selectedDepartmentsCount = selectedDepartmentIdsSet.size;
    const selectedProceduresCount = selectedProcedureIdsSet.size;

    const toggleDepartmentSelectionById = (departmentId: string) => {
      if (selectedDepartmentIdsSet.has(departmentId)) {
        selectedDepartmentIdsSet.delete(departmentId);
      } else {
        selectedDepartmentIdsSet.add(departmentId);
      }
      store.setFilterValue('departmentIds', Array.from(selectedDepartmentIdsSet).sort());
    };

    const toggleProcedureSelectionById = (procedureId: string) => {
      if (selectedProcedureIdsSet.has(procedureId)) {
        selectedProcedureIdsSet.delete(procedureId);
      } else {
        selectedProcedureIdsSet.add(procedureId);
      }
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
      <Stack gap="xs">
        <Flex justify="space-between" align="center" wrap="wrap" gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            Select departments and procedures to narrow visit results.
          </Text>
          {(selectedDepartmentsCount + selectedProceduresCount) > 0 && (
            <Badge size="xs" color="blue" variant="light" className={classes.countBadge}>
              {selectedDepartmentsCount}
              {' '}
              dept
              {selectedDepartmentsCount === 1 ? '' : 's'}
              {'  '}
              ·
              {'  '}
              {selectedProceduresCount}
              {' '}
              proc
            </Badge>
          )}
        </Flex>

        <TextInput
          placeholder="Search departments or procedures"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
          classNames={{ input: classes.searchInput }}
        />

        <Stack gap="xs">
          {visibleDepartments.map((department) => {
            const selectedProcedureCount = department.procedures
              .filter((procedure) => selectedProcedureIdsSet.has(procedure.id)).length;
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
                checked={selectedDepartmentIdsSet.has(department.id)}
                expanded={isExpanded}
                selectedProcedureCount={selectedProcedureCount}
                onToggleExpanded={() => toggleDepartmentExpanded(department.id)}
                onToggleDepartment={() => toggleDepartmentSelectionById(department.id)}
                procedures={department.procedures}
                totalProcedureCount={department.totalProcedureCount}
                selectedProcedureIdsSet={selectedProcedureIdsSet}
                onToggleProcedureById={toggleProcedureSelectionById}
              />
            );
          })}
          {visibleDepartments.length === 0 && (
            <Box className={classes.emptyState}>
              <Text size="xs" c="dimmed">
                No departments or procedures match your search.
              </Text>
            </Box>
          )}
        </Stack>
      </Stack>
    );
  });
}
