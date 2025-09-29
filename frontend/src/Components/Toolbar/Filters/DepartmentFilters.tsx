import { useCallback, useContext } from 'react';
import {
  Accordion, Badge, Box, Checkbox, Flex, ScrollArea, Text,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import { Store } from '../../../Store/Store';
import { chartColors } from '../../../Types/application';

function CustomControl({
  count, departmentMaxCount, idx, dept,
}: { count: number, departmentMaxCount: number, idx: number, dept: string }) {
  const controlHeight = 40;
  const controlWidthPercent = 100;
  return (
    <Accordion.Control p={0}>
      <Box
        w={`${controlWidthPercent}%`}
        h={controlHeight}
        mb={-controlHeight}
        style={{
          backgroundColor: chartColors[idx], position: 'relative', top: 0, left: 0, zIndex: 0, opacity: 0.3,
        }}
      />
      <Box
        w={`${((count) / departmentMaxCount) * controlWidthPercent}%`}
        h={controlHeight}
        mb={-controlHeight}
        style={{
          backgroundColor: chartColors[idx], position: 'relative', top: 0, left: 0, zIndex: 0, opacity: 0.5,
        }}
      />
      <Flex direction="row" justify="space-between" align="center" h={controlHeight} px="sm" style={{ position: 'relative', zIndex: 1 }}>
        <Flex p={0} gap="sm" align="center">
          <Checkbox value={dept} label="" onClick={(e) => e.stopPropagation()} />
          <Text>{dept}</Text>
        </Flex>
        <Badge variant="default">{count}</Badge>
      </Flex>
    </Accordion.Control>
  );
}

export function DepartmentFilters() {
  const store = useContext(Store);

  const departmentMaxCount = Math.max(...Object.values(store.departments), 0);

  const setSelectedDepartments = useCallback(async (selected: string[]) => {
    store.filtersStore.filterValues.departments = selected;

    await store.updateFilteredData();
  }, [store]);

  return useObserver(() => (
    <ScrollArea h={300} type="scroll" mb="md" p={0}>
      <Accordion multiple chevron={null}>
        <Checkbox.Group value={store.filtersStore.filterValues.departments} onChange={setSelectedDepartments} style={{ width: '100%' }}>
          {Object.entries(store.departments).sort((a, b) => b[1] - a[1]).map(([dept, count], idx) => (
            <Accordion.Item value={dept} key={dept}>
              <CustomControl count={count} departmentMaxCount={departmentMaxCount} idx={idx} dept={dept} />
              <Accordion.Panel>
                {['proc1', 'proc2', 'proc3'].map((proc) => (
                  <Text key={proc}>{proc}</Text>
                ))}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Checkbox.Group>
      </Accordion>
    </ScrollArea>
  ));
}
