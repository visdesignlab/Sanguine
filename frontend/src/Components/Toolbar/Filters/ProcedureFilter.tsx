import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  Collapse,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useContext, useState } from 'react';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import {
  ProcedureHierarchyDepartment,
  ProcedureHierarchyProcedure,
} from '../../../Types/application';

function ProcedureItem({
  procedure,
  checked,
  onToggle,
}: {
  procedure: ProcedureHierarchyProcedure;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Flex gap="xs" align="flex-start" py={2}>
      <Checkbox
        checked={checked}
        onChange={onToggle}
        size="xs"
        mt={2}
        aria-label={`Toggle ${procedure.name}`}
      />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" fw={checked ? 600 : 400}>
          {procedure.name}
        </Text>
        <Badge
          size="xs"
          variant={checked ? 'light' : 'outline'}
          color={checked ? 'blue' : 'gray'}
        >
          {procedure.visit_count.toLocaleString()}
          {' '}
          visits
        </Badge>
      </Box>
    </Flex>
  );
}

function ProcedureGroupOption({
  department,
  checked,
  indeterminate,
  expanded,
  selectedProcedureIds,
  onToggleExpanded,
  onToggleGroup,
  onToggleProcedure,
}: {
  department: ProcedureHierarchyDepartment;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  selectedProcedureIds: Set<string>;
  onToggleExpanded: () => void;
  onToggleGroup: () => void;
  onToggleProcedure: (procedureId: string) => void;
}) {
  const isActive = checked || indeterminate;

  return (
    <Paper withBorder p="xs" radius="md">
      <Flex justify="space-between" align="flex-start" gap="xs">
        <Flex gap="xs" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={onToggleGroup}
            mt={2}
            aria-label={`Toggle ${department.name}`}
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={isActive ? 700 : 600}>
              {department.name}
            </Text>
            <Badge
              size="xs"
              variant={isActive ? 'light' : 'outline'}
              color={isActive ? 'blue' : 'gray'}
              mt={2}
            >
              {department.visit_count.toLocaleString()}
              {' '}
              visits
            </Badge>
          </Box>
        </Flex>
        <ActionIcon
          variant="subtle"
          color={isActive ? 'blue' : 'gray'}
          onClick={onToggleExpanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${department.name}`}
        >
          <IconChevronDown
            size={18}
            style={expanded ? { transform: 'rotate(180deg)' } : undefined}
          />
        </ActionIcon>
      </Flex>

      <Collapse in={expanded}>
        <Stack gap={2} mt="xs" ml={28}>
          {department.procedures.map((procedure) => (
            <ProcedureItem
              key={procedure.id}
              procedure={procedure}
              checked={selectedProcedureIds.has(procedure.id)}
              onToggle={() => onToggleProcedure(procedure.id)}
            />
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
}

export function ProcedureFilter() {
  const store = useContext(Store);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  return useObserver(() => {
    const hierarchy = store.procedureHierarchy;

    if (!hierarchy || hierarchy.departments.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          No procedure data is currently available.
        </Text>
      );
    }

    const selectedProcedureIdsSet = new Set(store.filterValues.procedureIds);
    const selectedCount = selectedProcedureIdsSet.size;

    const lowerSearch = searchTerm.trim().toLowerCase();
    const filteredDepartments = hierarchy.departments
      .map((dept) => {
        const deptMatches = !lowerSearch || dept.name.toLowerCase().includes(lowerSearch);
        const matchingProcedures = deptMatches
          ? dept.procedures
          : dept.procedures.filter((p) => p.name.toLowerCase().includes(lowerSearch));
        return { ...dept, procedures: matchingProcedures };
      })
      .filter((dept) => dept.procedures.length > 0);

    const toggleGroupById = (deptId: string) => {
      const dept = hierarchy.departments.find((d) => d.id === deptId);
      if (!dept) return;
      const allSelected = dept.procedures.every((p) => selectedProcedureIdsSet.has(p.id));
      if (allSelected) {
        dept.procedures.forEach((p) => selectedProcedureIdsSet.delete(p.id));
      } else {
        dept.procedures.forEach((p) => selectedProcedureIdsSet.add(p.id));
      }
      store.setProcedureFilters(
        store.filterValues.departments,
        Array.from(selectedProcedureIdsSet).sort(),
      );
    };

    const toggleProcedureById = (procedureId: string) => {
      if (selectedProcedureIdsSet.has(procedureId)) {
        selectedProcedureIdsSet.delete(procedureId);
      } else {
        selectedProcedureIdsSet.add(procedureId);
      }
      store.setProcedureFilters(
        store.filterValues.departments,
        Array.from(selectedProcedureIdsSet).sort(),
      );
    };

    const toggleGroupExpanded = (deptId: string) => {
      setExpandedGroups((prev) => (
        prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
      ));
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
            {selectedCount > 0
              ? `${selectedCount} ${selectedCount === 1 ? 'Procedure' : 'Procedures'}`
              : 'All procedures'}
          </Badge>
        </Flex>

        <TextInput
          placeholder="Search procedure groups or procedures"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />

        <Stack gap="xs">
          {filteredDepartments.map((dept) => {
            const allSelected = dept.procedures.length > 0
              && dept.procedures.every((p) => selectedProcedureIdsSet.has(p.id));
            const someSelected = dept.procedures.some((p) => selectedProcedureIdsSet.has(p.id));
            const isExpanded = expandedGroups.includes(dept.id);

            return (
              <ProcedureGroupOption
                key={dept.id}
                department={dept}
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                expanded={isExpanded}
                selectedProcedureIds={selectedProcedureIdsSet}
                onToggleExpanded={() => toggleGroupExpanded(dept.id)}
                onToggleGroup={() => toggleGroupById(dept.id)}
                onToggleProcedure={toggleProcedureById}
              />
            );
          })}
          {filteredDepartments.length === 0 && (
            <Paper withBorder p="xs" radius="md">
              <Text size="xs" c="dimmed">
                No procedures match your search.
              </Text>
            </Paper>
          )}
        </Stack>
      </Stack>
    );
  });
}
