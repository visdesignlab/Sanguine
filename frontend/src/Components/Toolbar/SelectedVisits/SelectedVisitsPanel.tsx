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
  const filteredVisitAttributes = useMemo(() => {
    if (!selectedVisit || !attributeSearchQuery.trim()) {
      return selectedVisit ? Object.entries(selectedVisit) : [];
    }

    const searchTerm = attributeSearchQuery.toLowerCase().trim();
    return Object.entries(selectedVisit).filter(([key, value]) => {
      // Search in the human-readable column name
      const humanReadableKey = makeHumanReadableColumn(key).toLowerCase();
      // Search in the human-readable value
      const humanReadableValue = makeHumanReadableValues(
        key,
        value,
      ).toString().toLowerCase();

      return humanReadableKey.includes(searchTerm)
        || humanReadableValue.includes(searchTerm)
        || key.toLowerCase().includes(searchTerm);
    });
  }, [selectedVisit, attributeSearchQuery]);

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
    <Box>
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

              {/* Display filtered attributes */}
              {filteredVisitAttributes.length > 0 ? (
                filteredVisitAttributes.map(([key, value]) => (
                  <Stack key={key} gap={0}>
                    <Title order={6}>{makeHumanReadableColumn(key)}</Title>
                    <Text>
                      {makeHumanReadableValues(
                        key as keyof typeof makeHumanReadableColumn,
                        value,
                      )}
                    </Text>
                  </Stack>
                ))
              ) : (
                <Text c="dimmed" size="sm">
                  No attributes match your search &quot;
                  {attributeSearchQuery}
                  &quot;
                </Text>
              )}
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
