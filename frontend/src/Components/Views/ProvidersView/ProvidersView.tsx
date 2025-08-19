import {
  Divider, Flex, Stack, Title, Tooltip,
} from '@mantine/core';
import { useContext } from 'react';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function ProvidersView() {
  const store = useContext(Store);

  const { toolbarWidth } = useThemeConstants();

  return (
    <Stack mb="xl" gap="lg">
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        {/** Dashboard Title */}
        <Title order={3}>Providers</Title>
        <Flex direction="row" align="center" gap="md">
          <Tooltip label="Visible visits after filters" position="bottom">
            <Title order={5} c="dimmed">
              {`${store.filteredVisits.length} / ${store.allVisits.length}`}
              {' '}
              Visits
            </Title>
          </Tooltip>
        </Flex>
      </Flex>
      <Divider />
    </Stack>
  );
}
