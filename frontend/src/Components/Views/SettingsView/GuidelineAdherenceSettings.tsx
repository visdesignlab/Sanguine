import {
  Accordion, Box, Divider, LoadingOverlay,
} from '@mantine/core';
import {
  useState,
} from 'react';
import { getIconForVar } from '../../../Utils/icons';

export function GuidelineAdherenceSettings() {
  const [loading, _] = useState(false);

  const ControlIcon = getIconForVar('rbc_adherent');
  return (
    <Accordion.Item value="guidelineAdherenceSettings">
      <Accordion.Control icon={<ControlIcon size={16} />} disabled>Guideline Adherence Settings</Accordion.Control>
      <Accordion.Panel>
        <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Divider mb="sm" />
        <Box mx="auto" maw={1000}>
          hello
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
