import { useCallback, useContext } from 'react';
import {
  Accordion, Badge, Box, Checkbox, Flex, ScrollArea, Text,
} from '@mantine/core';
import { useObserver } from 'mobx-react';
import { Store } from '../../../Store/Store';

function CustomControl({
  count, departmentMaxCount, dept, color,
}: { count: number, departmentMaxCount: number, dept: string, color: string }) {
  const controlHeight = 40;
  const controlWidthPercent = 100;

  return (
    <Accordion.Control p={0}>
      <Box
        w={`${controlWidthPercent}%`}
        h={controlHeight}
        mb={-controlHeight}
        style={{
          backgroundColor: color, position: 'relative', top: 0, left: 0, zIndex: 0, opacity: 0.3,
        }}
      />
      <Box
        w={`${((count) / departmentMaxCount) * controlWidthPercent}%`}
        h={controlHeight}
        mb={-controlHeight}
        style={{
          backgroundColor: color, position: 'relative', top: 0, left: 0, zIndex: 0, opacity: 0.6,
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

  const departmentMaxCount = Math.max(
    ...Object.values(store.departments).map((dept) => dept.count),
    0,
  );

  const setSelectedDepartments = useCallback(async (selected: string[]) => {
    store.filtersStore.filterValues.departments = selected;

    await store.updateFilteredData();
  }, [store]);

  return useObserver(() => (
    <ScrollArea h={450} type="scroll" mb="md" p={0}>
      <Accordion multiple chevron={null}>
        <Checkbox.Group value={store.filtersStore.filterValues.departments} onChange={setSelectedDepartments}>
          {Object.entries(store.departments).sort((a, b) => b[1].count - a[1].count).map(([dept, { count, color }]) => (
            <Accordion.Item value={dept} key={dept}>
              <CustomControl count={count} departmentMaxCount={departmentMaxCount} color={color} dept={dept} />
              <Accordion.Panel>
                {['Procedure A', 'Procedure B', 'Procedure C'].map((proc) => (
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
