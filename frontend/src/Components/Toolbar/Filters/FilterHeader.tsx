import {
  Accordion, ActionIcon, Badge, Flex, Title, Tooltip,
} from '@mantine/core';
import { useContext } from 'react';
import { IconRestore } from '@tabler/icons-react';
import { useObserver } from 'mobx-react';
import { Store } from '../../../Store/Store';
import { FiltersStore } from '../../../Store/FiltersStore';

export function FilterHeader({
  countName, title, tooltipLabel, resetFunc,
}: {
  countName: keyof FiltersStore, title: string, tooltipLabel: string, resetFunc: () => void
}) {
  const store = useContext(Store);

  return useObserver(() => {
    const count = store.filtersStore[countName] as number;

    return (
      <Flex align="center">
        <Accordion.Control px="xs">
          <Flex justify="space-between" align="center" gap="xs" mr="xs">
            <Tooltip label={tooltipLabel}>
              <Title order={4} c={count ? 'blue.6' : undefined}>{title}</Title>
            </Tooltip>
            {count > 0 ? (
              <Badge color="blue" radius="sm" variant="light">
                {count}
              </Badge>
            ) : null}
          </Flex>
        </Accordion.Control>
        <Tooltip label={`Reset ${title}`}>
          <ActionIcon size="sm" onClick={(event) => (count === 0 ? event.preventDefault() : resetFunc())} data-disabled={count === 0}>
            <IconRestore stroke={1} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    );
  });
}
