import { ScrollArea, Accordion } from '@mantine/core';
import { useThemeConstants } from '../../../Theme/mantineTheme';
import { DateFilters } from './DateFilters';
import { BloodComponentFilters } from './BloodComponentFilters';
import { MedicationFilters } from './MedicationFilters';
import { OutcomeFilters } from './OutcomeFilters';

/**
 * @returns Filter Panel accordion with multiple filter sections
 */
export function FilterPanel() {
  const { toolbarWidth } = useThemeConstants();

  return (
    <ScrollArea h={`calc(100vh - ${toolbarWidth}px - 45px)`} type="scroll" overscrollBehavior="contain">
      <Accordion multiple>
        <DateFilters />
        <BloodComponentFilters />
        <MedicationFilters />
        <OutcomeFilters />
      </Accordion>
    </ScrollArea>
  );
}
