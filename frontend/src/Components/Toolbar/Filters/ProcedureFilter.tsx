import {
  Badge,
  Checkbox,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useContext, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import type { ProcedureHierarchyProcedure } from '../../../Types/application';

function ProcedureOption({
  procedure,
  checked,
  onToggle,
}: {
  procedure: ProcedureHierarchyProcedure;
  checked: boolean;
  onToggle: () => void;
}) {
  const [badgeHovered, setBadgeHovered] = useState(false);

  return (
    <Tooltip
      label={`Filter to Visits that underwent ${procedure.name} at least once`}
      position="right"
      openDelay={400}
      disabled={badgeHovered}
    >
      <Paper withBorder p="xs" radius="md">
        <Checkbox
          checked={checked}
          onChange={onToggle}
          label={(
            <Flex justify="space-between" align="flex-start" gap="xs" w="100%" wrap="nowrap">
              <Text size="sm" fw={checked ? 700 : 600} style={{ flex: 1, minWidth: 0 }}>
                {procedure.name}
              </Text>
              <Tooltip
                label={`${procedure.visit_count.toLocaleString()} Visits underwent ${procedure.name} at least once`}
                position="bottom"
                openDelay={200}
              >
                <Badge
                  size="xs"
                  variant={checked ? 'filled' : 'light'}
                  color={checked ? 'blue' : 'gray'}
                  style={{ flexShrink: 0 }}
                  onMouseEnter={() => setBadgeHovered(true)}
                  onMouseLeave={() => setBadgeHovered(false)}
                >
                  {procedure.visit_count.toLocaleString()}
                  {' '}
                  visits
                </Badge>
              </Tooltip>
            </Flex>
          )}
        />
      </Paper>
    </Tooltip>
  );
}

export function ProcedureFilter() {
  const store = useContext(Store);
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

    const allProcedures = hierarchy.departments
      .flatMap((dept) => dept.procedures)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (allProcedures.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          No procedure data is currently available.
        </Text>
      );
    }

    const selectedProcedureIdsSet = new Set(store.filterValues.procedureIds);

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visibleProcedures = normalizedSearch
      ? allProcedures.filter((p) => p.name.toLowerCase().includes(normalizedSearch))
      : allProcedures;

    const toggleProcedureById = (procedureId: string) => {
      if (selectedProcedureIdsSet.has(procedureId)) {
        selectedProcedureIdsSet.delete(procedureId);
      } else {
        selectedProcedureIdsSet.add(procedureId);
      }
      store.setProcedureFilters(Array.from(selectedProcedureIdsSet).sort());
    };

    const selectedCount = selectedProcedureIdsSet.size;

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
            ? `${selectedCount} ${selectedCount === 1 ? 'Procedure' : 'Procedures'}`
            : 'All procedures'}
        </Badge>

        <TextInput
          placeholder="Search procedures"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="xs"
        />

        <Stack gap="xs">
          {visibleProcedures.map((procedure) => (
            <ProcedureOption
              key={procedure.id}
              procedure={procedure}
              checked={selectedProcedureIdsSet.has(procedure.id)}
              onToggle={() => toggleProcedureById(procedure.id)}
            />
          ))}
          {visibleProcedures.length === 0 && (
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
