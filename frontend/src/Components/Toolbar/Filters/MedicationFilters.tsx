import {
  Accordion, Flex, Title,
} from '@mantine/core';
import { useObserver } from 'mobx-react';

export function MedicationFilters() {
  return useObserver(() => (
    <Accordion.Item value="medication-filters" key="medication-filters">
      <Accordion.Control px="xs">
        <Flex justify="space-between" align="center" gap="xs" mr="xs">
          <Title order={4}>Prior Medications</Title>
        </Flex>
      </Accordion.Control>
    </Accordion.Item>
  ));
}
