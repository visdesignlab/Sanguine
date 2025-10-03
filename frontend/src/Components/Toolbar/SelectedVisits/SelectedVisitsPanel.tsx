import {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useObserver } from 'mobx-react-lite';
import {
  Badge,
  Divider,
  NavLink,
  ScrollArea,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { List, RowComponentProps } from 'react-window';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import {
  makeHumanReadableColumn,
  makeHumanReadableValues,
} from '../../../Utils/humanReadableColsVals';

/**
 * Visit list row renderer for react-window's List
 * Renders a single visit number as a selectable NavLink.
 */
function RowComponent({
  index,
  visitNos,
  selectedVisitNo,
  setSelectedVisitNo,
  style,
}: RowComponentProps<{
  visitNos: number[];
  selectedVisitNo: number | null;
  setSelectedVisitNo: (visitNo: number) => void;
}>) {
  const visitNo = visitNos[index];

  return (
    <NavLink
      label={visitNo}
      key={visitNo}
      active={selectedVisitNo === visitNo}
      onClick={() => setSelectedVisitNo(visitNo)}
      style={style}
    />
  );
}

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

  // Chosen visit from list
  const [selectedVisitNo, setSelectedVisitNo] = useState<number | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<{
    visit_no: number;
    [key: string]: unknown;
  } | null>(null);

  // Choose first visit by default
  useEffect(() => {
    if (selectedVisitNo === null && visitNos.length > 0) {
      setSelectedVisitNo(visitNos[0]);
    }
    if (visitNos.length === 0) {
      setSelectedVisitNo(null);
      setSelectedVisit(null);
    }
  }, [visitNos, selectedVisitNo]);
  // Fetch details whenever a visit number is chosen
  useEffect(() => {
    if (selectedVisitNo != null) {
      store.selectionsStore.getVisitInfo(selectedVisitNo).then(setSelectedVisit);
    } else {
      setSelectedVisit(null);
    }
  }, [selectedVisitNo, store.selectionsStore]);

  return useObserver(() => (
    <Stack>
      {/* Header: count of selected visits */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Badge variant="light" size="sm" mt="md">
          {store.selectionsStore.selectedVisitNos.length}
          {' '}
          Visits
        </Badge>
      </div>
      {/* Virtualized list of visit numbers */}
      <List
        rowComponent={RowComponent}
        rowCount={visitNos.length}
        rowHeight={25}
        rowProps={{
          visitNos,
          selectedVisitNo,
          setSelectedVisitNo,
        }}
        overscanCount={3}
        style={{ height: 250, overflow: 'auto' }}
      />
      <Divider />
      {/* Details panel for the selected visit */}
      <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px - 250px - 30px)`}>
        {selectedVisit ? (
          <Stack p="sm">
            {Object.entries(selectedVisit).map(([key, value]) => (
              <Stack key={key} gap={0}>
                <Title order={6}>{makeHumanReadableColumn(key)}</Title>
                <Text>
                  {makeHumanReadableValues(
                    key as keyof typeof makeHumanReadableColumn,
                    value,
                  )}
                </Text>
              </Stack>
            ))}
            <Space h={15} />
          </Stack>
        ) : (
          <Stack p="sm">
            <Text c="dimmed">Select a visit to see its details.</Text>
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  ));
}
