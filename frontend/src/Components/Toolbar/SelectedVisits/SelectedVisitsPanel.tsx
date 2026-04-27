import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useObserver } from 'mobx-react-lite';
import {
  Accordion,
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

const ATTRIBUTE_GROUPS = [
  {
    id: 'overview',
    label: 'Visit Overview',
    keys: [
      'visit_no', 'mrn', 'adm_dtm', 'dsch_dtm', 'age_at_adm',
      'pat_class_desc', 'apr_drg_weight', 'ms_drg_weight',
      'month', 'quarter', 'year',
      'attending_provider', 'attending_provider_id', 'attending_provider_line',
      'attending_provider_department', 'is_admitting_attending',
    ],
  },
  {
    id: 'procedures',
    label: 'Visit Procedures',
    keys: ['procedure_ids'],
  },
  {
    id: 'blood-products',
    label: 'Blood Products',
    keys: [
      'rbc_units', 'ffp_units', 'plt_units', 'cryo_units', 'whole_units',
      'cell_saver_ml', 'overall_units',
      'rbc_units_adherent', 'ffp_units_adherent', 'plt_units_adherent',
      'cryo_units_adherent', 'overall_units_adherent',
    ],
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    keys: ['los', 'death', 'vent', 'stroke', 'ecmo'],
  },
  {
    id: 'medications',
    label: 'Prophylactic Medications',
    keys: ['b12', 'iron', 'antifibrinolytic'],
  },
  {
    id: 'costs',
    label: 'Costs',
    keys: [
      'rbc_units_cost', 'plt_units_cost', 'ffp_units_cost', 'cryo_units_cost',
      'whole_cost', 'cell_saver_cost',
    ],
  },
];

function ProcedureList({ procedureIdsStr }: { procedureIdsStr: unknown }) {
  const [search, setSearch] = useState('');

  const procedures = useMemo(() => {
    if (!procedureIdsStr) return [];

    // Aggressively extract identifiers by splitting on any bracket, quote, brace, or comma
    const raw = String(procedureIdsStr);
    const extracted = Array.from(new Set(
      raw.split(/[[\],{}"]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ));

    return extracted.map((proc) => proc
      .replace(/__/g, ': ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())).filter(Boolean);
  }, [procedureIdsStr]);

  const filtered = useMemo(() => {
    if (!search.trim()) return procedures;
    const lowerSearch = search.toLowerCase();
    return procedures.filter((p) => p.toLowerCase().includes(lowerSearch));
  }, [procedures, search]);

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
              {procedures.length === 0 ? 'No procedures recorded.' : 'No procedures match search.'}
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
      store.getVisitInfo(store.state.ui.selectedVisitNo).then(setSelectedVisit);
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

    const allEntries = Object.entries(selectedVisit);
    const usedKeys = new Set<string>();

    const groups = ATTRIBUTE_GROUPS.map((group) => {
      const items = group.keys
        .filter((key) => {
          if (isInPrivateMode && (key === 'attending_provider_id' || key === 'attending_provider')) return false;
          if (selectedVisit[key] === undefined || selectedVisit[key] === null) return false;

          usedKeys.add(key);

          if (!searchTerm) return true;

          const humanReadableKey = makeHumanReadableColumn(key).toLowerCase();
          const humanReadableValue = makeHumanReadableValues(key, selectedVisit[key]).toString().toLowerCase();

          return humanReadableKey.includes(searchTerm)
            || humanReadableValue.includes(searchTerm)
            || key.toLowerCase().includes(searchTerm);
        })
        .map((key) => ({ key, value: selectedVisit[key] }));

      return { ...group, items };
    });

    // Add remaining keys to a Misc group if they match search
    const miscItems = allEntries
      .filter(([key]) => !usedKeys.has(key))
      .filter(([key, value]) => {
        if (value === undefined || value === null) return false;
        if (!searchTerm) return true;
        const humanReadableKey = makeHumanReadableColumn(key).toLowerCase();
        const humanReadableValue = makeHumanReadableValues(key, value).toString().toLowerCase();
        return humanReadableKey.includes(searchTerm)
          || humanReadableValue.includes(searchTerm)
          || key.toLowerCase().includes(searchTerm);
      })
      .map(([key, value]) => ({ key, value }));

    if (miscItems.length > 0) {
      groups.push({
        id: 'misc', label: 'Other Details', keys: [], items: miscItems,
      });
    }

    return groups.filter((g) => g.items.length > 0);
  }, [selectedVisit, attributeSearchQuery, store.state.ui]);

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleClickVisitNo = useCallback((visitNo: number) => {
    // Deselect if already selected
    if (store.state.ui.selectedVisitNo === visitNo) {
      setSelectedVisitNo(null);
      return;
    }

    // Render loading overlay when changing selection
    if (store.state.ui.selectedVisitNo !== null) {
      setLoadingVisit(true);
    }
    setSelectedVisitNo(visitNo);

    // Clear any existing timeout before starting a new one
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Simulate loading delay for better UX
    loadingTimeoutRef.current = setTimeout(() => setLoadingVisit(false), 200);
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

              <Accordion
                multiple
                defaultValue={ATTRIBUTE_GROUPS.map((g) => g.id).concat(['misc'])}
                styles={{
                  content: { padding: '8px 12px' },
                  item: { borderBottom: 'none' },
                  control: { padding: '8px 0' },
                }}
              >
                {groupedAttributes.map((group) => (
                  <Accordion.Item key={group.id} value={group.id}>
                    <Accordion.Control>
                      <Text fw={700} size="sm">{group.label}</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs">
                        {group.items.map(({ key, value }) => (
                          <Box key={key}>
                            <Text size="xs" fw={500} c="dimmed">
                              {makeHumanReadableColumn(key)}
                            </Text>
                            {key === 'procedure_ids' ? (
                              <ProcedureList procedureIdsStr={value} />
                            ) : (
                              <Text size="sm" style={{ wordBreak: 'break-word' }}>
                                {makeHumanReadableValues(key, value)}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
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
