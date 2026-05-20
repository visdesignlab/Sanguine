import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useObserver } from 'mobx-react-lite';
import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Flex,
  LoadingOverlay,
  NavLink,
  ScrollArea,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { List } from 'react-window';
import { IconRestore, IconSearch } from '@tabler/icons-react';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  makeHumanReadableColumn,
  makeHumanReadableValues,
} from '../../../Utils/humanReadableColsVals';
import { SELECTED_VISITS_PANEL_ATTRIBUTES } from '../../../Types/application';
import classes from '../../../Shell/Shell.module.css';

function formatVisitCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)} M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)} K`;
  }
  return count.toString();
}

function ProcedureList({ procedureIdsStr }: { procedureIdsStr: unknown }) {
  const [search, setSearch] = useState('');
  const procedures = useMemo(() => {
    if (!procedureIdsStr) return [];
    const raw = String(procedureIdsStr);
    return Array.from(new Set(raw.split(/[[\],{}"]+/).map((s) => s.trim()).filter(Boolean)))
      .map((proc) => proc.replace(/__/g, ': ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  }, [procedureIdsStr]);

  const filtered = procedures.filter((p) => p.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <Stack gap="xs" mt="xs">
      <TextInput
        placeholder="Search procedures..."
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        leftSection={<IconSearch size={12} />}
        size="xs"
      />
      <ScrollArea h={150} type="auto" offsetScrollbars>
        <Stack gap={4}>
          {filtered.length > 0 ? filtered.map((p, i) => (
            <Flex key={i} align="flex-start" gap={6} px={4}>
              <Text size="sm" c="blue" fw={700}>•</Text>
              <Text size="sm" style={{ wordBreak: 'break-word', flex: 1 }}>{p}</Text>
            </Flex>
          )) : (
            <Text size="xs" c="dimmed" fs="italic" p="xs">
              {procedures.length === 0 ? 'No procedures recorded.' : 'No match found.'}
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

/**
 * SelectedVisitsPanel
 * - Shows a count of selected visits
 * - Renders a virtualized list of selected visit numbers
 * - Displays details for the currently selected visit
 */
export function SelectedVisitsPanel() {
  const { toolbarWidth, iconStroke } = useThemeConstants();
  const store = useContext(Store);

  // All selected visit numbers from the store
  const visitNos = store.selectedVisitNos;

  // Filter visit numbers by search query
  const [searchQuery, setSearchQuery] = useState('');
  const filteredVisitNos = useMemo(() => {
    if (!searchQuery.trim()) {
      return visitNos;
    }
    return visitNos.filter((visitNo) => visitNo.toString().includes(searchQuery.trim()));
  }, [visitNos, searchQuery]);

  // Chosen visit from list
  const [loadingVisit, setLoadingVisit] = useState(false);

  // Selected Visit Number
  const setSelectedVisitNo = useCallback((visitNo: number | null) => {
    store.actions.setUiState({ selectedVisitNo: visitNo });
  }, [store.actions]);

  const [selectedVisit, setSelectedVisit] = useState<{
    visit_no: number;
    [key: string]: unknown;
  } | null>(null);

  // When selected visits no longer include the current selection, clear it
  useEffect(() => {
    if (store.state.ui.selectedVisitNo != null && !store.selectedVisitNos.includes(store.state.ui.selectedVisitNo)) {
      setSelectedVisitNo(null);
      setSelectedVisit(null);
    }
  }, [store.selectedVisitNos, store.state.ui.selectedVisitNo, setSelectedVisitNo]);

  // Fetch details whenever a visit number is chosen
  useEffect(() => {
    if (store.state.ui.selectedVisitNo != null) {
      setLoadingVisit(true);
      store.getVisitInfo(store.state.ui.selectedVisitNo)
        .then(setSelectedVisit)
        .finally(() => setLoadingVisit(false));
    } else {
      setSelectedVisit(null);
    }
  }, [store.state.ui.selectedVisitNo, store]);

  // Filter visit details based on search query
  const [attributeSearchQuery, setAttributeSearchQuery] = useState('');

  const groupedAttributes = useMemo(() => {
    if (!selectedVisit) return [];
    const searchTerm = attributeSearchQuery.toLowerCase().trim();
    const { isInPrivateMode } = store.state.ui;
    const usedKeys = new Set<string>();

    const filterEntry = (key: string, val: unknown) => {
      if (isInPrivateMode && ['attending_provider_id', 'attending_provider'].includes(key)) return false;
      if (val == null) return false;
      if (!searchTerm) return true;
      return [key, makeHumanReadableColumn(key), String(makeHumanReadableValues(key, val))]
        .some((s) => s.toLowerCase().includes(searchTerm));
    };

    const groups = SELECTED_VISITS_PANEL_ATTRIBUTES.map((group) => ({
      ...group,
      items: group.keys
        .filter((key) => filterEntry(key, selectedVisit[key]) && usedKeys.add(key))
        .map((key) => ({ key, value: selectedVisit[key] })),
    }));

    const miscItems = Object.entries(selectedVisit)
      .filter(([key, value]) => !usedKeys.has(key) && filterEntry(key, value))
      .map(([key, value]) => ({ key, value }));

    if (miscItems.length) {
      groups.push({
        id: 'misc', label: 'Other Details', keys: [], items: miscItems,
      });
    }
    return groups.filter((g) => g.items.length > 0);
  }, [selectedVisit, attributeSearchQuery, store.state.ui]);

  const handleClickVisitNo = useCallback((visitNo: number) => {
    setSelectedVisitNo(store.state.ui.selectedVisitNo === visitNo ? null : visitNo);
  }, [store.state.ui.selectedVisitNo, setSelectedVisitNo]);

  return useObserver(() => (
    <Box style={{ minWidth: 0, width: '100%' }}>
      {/* Panel Header */}
      <Flex direction="row" justify="space-between" align="center" h={40}>
        <Title order={3}>Selected Visits</Title>
        <Flex direction="row" align="center">
          <Tooltip label={`${store.selectedVisitNos.length} visits selected`} position="bottom">
            <Badge
              variant="light"
              size="sm"
            >
              {formatVisitCount(store.selectedVisitNos.length)}
              {' '}
              Visits
            </Badge>
          </Tooltip>
          <Tooltip label="Clear all selected visits" position="bottom">
            <ActionIcon
              aria-label="Reset all filters"
              onClick={() => { store.resetSelections(); }}
              className={classes.leftToolbarIcon}
              ml={4}
            >
              <IconRestore stroke={iconStroke} size={21} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>

      {/* Panel Content */}
      <Stack mt="md">
        <TextInput
          placeholder="Search visits..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="sm"
        />
        {/* Virtualized list of visit numbers */}
        <List
          rowComponent={({ index, style }) => (
            <NavLink
              label={filteredVisitNos[index]}
              key={filteredVisitNos[index]}
              active={store.state.ui.selectedVisitNo === filteredVisitNos[index]}
              onClick={() => handleClickVisitNo(filteredVisitNos[index])}
              style={style}
            />
          )}
          rowProps={{
            visitNos: filteredVisitNos,
            selectedVisitNo: store.state.ui.selectedVisitNo,
            setSelectedVisitNo,
          }}
          rowCount={filteredVisitNos.length}
          rowHeight={25}
          overscanCount={3}
          style={{ height: 250, overflow: 'auto' }}
        />
        <Divider />
        {/* Details panel for the selected visit */}
        <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px - 250px - 30px - 40px - 40px)`}>
          <LoadingOverlay visible={loadingVisit} overlayProps={{ blur: 2 }} />
          {selectedVisit ? (
            <Stack p="sm">
              {/* Search bar for visit attributes */}
              <TextInput
                placeholder="Search visit attributes..."
                value={attributeSearchQuery}
                onChange={(event) => setAttributeSearchQuery(event.currentTarget.value)}
                leftSection={<IconSearch size={14} />}
                size="xs"
                mb="sm"
              />

              <Stack gap="lg">
                {groupedAttributes.map((group) => (
                  <Box key={group.id}>
                    <Text
                      fw={700}
                      size="xs"
                      tt="uppercase"
                      c="blue.7"
                      mb={8}
                      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: 2 }}
                    >
                      {group.label}
                    </Text>
                    <Stack gap="xs">
                      {group.items.map(({ key, value }) => (
                        <Box key={key}>
                          <Text size="xs" fw={500} c="dimmed" lh={1}>
                            {makeHumanReadableColumn(key)}
                          </Text>
                          {key === 'procedure_ids' ? (
                            <ProcedureList procedureIdsStr={value} />
                          ) : (
                            <Text size="sm" style={{ wordBreak: 'break-word' }} lh={1.4}>
                              {makeHumanReadableValues(key, value)}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Space h={15} />
            </Stack>
          ) : (
            <Stack p="sm">
              <Text c="dimmed">Select a visit to see its details.</Text>
            </Stack>
          )}
        </ScrollArea>
      </Stack>
    </Box>
  ));
}
