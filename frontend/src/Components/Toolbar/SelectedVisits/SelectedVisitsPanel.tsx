import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useObserver } from 'mobx-react-lite';
import {
  Badge,
  Box,
  Divider,
  Flex,
  NavLink,
  ScrollArea,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { List } from 'react-window';
import { IconSearch } from '@tabler/icons-react';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  makeHumanReadableColumn,
  makeHumanReadableValues,
} from '../../../Utils/humanReadableColsVals';

/**
 * SelectedVisitsPanel
 * - Shows a count of selected visits
 * - Renders a virtualized list of selected visit numbers
 * - Displays details for the currently selected visit
 */
export function SelectedVisitsPanel() {
  const { toolbarWidth } = useThemeConstants();
  const store = useContext(Store);

  // All selected visit numbers from the store
  const visitNos = store.selectionsStore.selectedVisitNos;

  // Filter visit numbers by search query
  const [searchQuery, setSearchQuery] = useState('');
  const filteredVisitNos = useMemo(() => {
    if (!searchQuery.trim()) {
      return visitNos;
    }
    return visitNos.filter((visitNo) => visitNo.toString().includes(searchQuery.trim()));
  }, [visitNos, searchQuery]);

  // Chosen visit from list
  const selectedVisitNo = store.provenanceStore.provenance.getState(store.provenanceStore.provenance.current).ui.selectedVisitNo;
  const setSelectedVisitNo = (visitNo: number | null) => {
    store.provenanceStore.actions.setUiState({ selectedVisitNo: visitNo });
  };
  const [selectedVisit, setSelectedVisit] = useState<{
    visit_no: number;
    [key: string]: unknown;
  } | null>(null);

  // Choose first visit by default
  useEffect(() => {
    if (selectedVisitNo === null && filteredVisitNos.length > 0) {
      setSelectedVisitNo(filteredVisitNos[0]);
    }
    if (filteredVisitNos.length === 0) {
      setSelectedVisitNo(null);
      setSelectedVisit(null);
    }
    // If current selection is not in filtered results, clear it
    if (selectedVisitNo !== null && !filteredVisitNos.includes(selectedVisitNo)) {
      setSelectedVisitNo(filteredVisitNos.length > 0 ? filteredVisitNos[0] : null);
    }
  }, [filteredVisitNos, selectedVisitNo]);

  // Fetch details whenever a visit number is chosen
  useEffect(() => {
    if (selectedVisitNo != null) {
      store.selectionsStore.getVisitInfo(selectedVisitNo).then(setSelectedVisit);
    } else {
      setSelectedVisit(null);
    }
  }, [selectedVisitNo, store.selectionsStore]);

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
        key as keyof typeof makeHumanReadableColumn,
        value,
      ).toString().toLowerCase();

      return humanReadableKey.includes(searchTerm)
        || humanReadableValue.includes(searchTerm)
        || key.toLowerCase().includes(searchTerm);
    });
  }, [selectedVisit, attributeSearchQuery]);

  return useObserver(() => (
    <Box>
      {/* Panel Header */}
      <Flex direction="row" justify="space-between" align="center" h={40}>
        <Title order={3}>Selected Visits</Title>
        <Flex direction="row" align="center">
          <Badge variant="light" size="sm">
            {store.selectionsStore.selectedVisitNos.length}
            {' '}
            Visits
          </Badge>
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
              active={selectedVisitNo === filteredVisitNos[index]}
              onClick={() => setSelectedVisitNo(filteredVisitNos[index])}
              style={style}
            />
          )}
          rowProps={{
            visitNos: filteredVisitNos,
            selectedVisitNo,
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
