import {
  Accordion, Divider, Flex, Stack, Title,
} from '@mantine/core';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { BloodProductCostSettings } from './BloodProductCostSettings';
import { GuidelineAdherenceSettings } from './GuidelineAdherenceSettings';

export function SettingsView() {
  const { toolbarWidth } = useThemeConstants();

  // Return settings options components
  return (
    <Stack mb="xl" gap="lg">
      <Flex direction="row" justify="space-between" align="center" h={toolbarWidth / 2}>
        {/** Dashboard Title */}
        <Title order={3}>Settings</Title>
      </Flex>
      <Divider />
      <Accordion multiple defaultValue={['bloodProductCosts']} variant="contained" radius="md">
        <BloodProductCostSettings />
        <GuidelineAdherenceSettings />
      </Accordion>
    </Stack>
  );
}
